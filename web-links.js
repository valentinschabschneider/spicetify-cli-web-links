// @ts-check

// NAME: Web Links
// AUTHOR: valentinschabschneider
// DESCRIPTION: Adds Web Links.

/// <reference path="../globals.d.ts" />
(function Links() {
    if (!Spicetify.CosmosAsync ||
        !Spicetify.Player.origin2 ||
        !Spicetify.Platform
    ) {
        setTimeout(Links, 1000);
        return;
    }

    class Link {
        constructor(text, urlEncoder, artistUrl, albumUrl, trackUrl) {
            this.text = text
            this.urlEncoder = urlEncoder
            this.artistUrl = artistUrl
            this.albumUrl = albumUrl
            this.trackUrl = trackUrl
        }

        async getUrl(uriObj) {
            let url = ""
            let replacements = {}

            switch (uriObj.type) {
                case Spicetify.URI.Type.TRACK:
                    url = this.trackUrl;

                    const track = await fetchTrack(uriObj.getBase62Id());

                    replacements = {
                        artist: track.artists[0].name,
                        album: track.album.name,
                        track: track.name
                    }

                    break;
                case Spicetify.URI.Type.ALBUM:
                    url = this.albumUrl;

                    const album = await fetchAlbum(uriObj.getBase62Id());

                    replacements = {
                        artist: album.artists[0].name,
                        album: album.name,
                        type: album.type
                    }

                    break;
                case Spicetify.URI.Type.ARTIST:
                    url = this.artistUrl;

                    const artist = await fetchArtist(uriObj.getBase62Id());

                    replacements = {
                        artist: artist.info.name
                    }
                    break;
                default:
                    throw "unsupported type";
            }

            return url.replace(
                /{(\w+)}/g,
                (placeholderWithDelimiters, placeholderWithoutDelimiters) =>
                this.urlEncoder(replacements.hasOwnProperty(placeholderWithoutDelimiters) ?
                    replacements[placeholderWithoutDelimiters] : placeholderWithDelimiters)
            );
        }
    }

    const links = [
        new Link(
            "LastFm",
            encodeURIComponent,
            "https://www.last.fm/music/{artist}",
            "https://www.last.fm/music/{artist}/{album}",
            "https://www.last.fm/music/{artist}/{album}/{track}"
        ),
        new Link(
            "RYM",
            (str) => {
                return str.replace(/\s+/g, "-").replace(/[',:]/g, "").replace("&", "and").toLowerCase()
            },
            "https://rateyourmusic.com/artist/{artist}",
            "https://rateyourmusic.com/release/{type}/{artist}/{album}/",
            "https://rateyourmusic.com/release/single/{artist}/{track}/"
        ),
        new Link(
            "RYM search",
            encodeURIComponent,
            "https://rateyourmusic.com/search?searchterm={artist}&searchtype=a",
            "https://rateyourmusic.com/search?searchterm={artist}%20{album}&searchtype=l",
            "https://rateyourmusic.com/search?searchterm={artist}%20{track}&searchtype=l"
        )
    ];

    const buildContextMenuItem = (link) => {
        return new Spicetify.ContextMenu.Item(
            link.text,
            (uris) => {
                const uriObj = Spicetify.URI.fromString(uris[0]);
                link.getUrl(uriObj).then((url) => window.open(url));
            },
            (uris) => {
                // this isn't called
                const uriObj = Spicetify.URI.fromString(uris[0]);
                switch (uriObj.type) {
                    case Spicetify.URI.Type.ARTIST:
                        return link.artistUrl !== undefined;
                    case Spicetify.URI.Type.ALBUM:
                        return link.albumUrl !== undefined;
                    case Spicetify.URI.Type.TRACK:
                        return link.trackUrl !== undefined;
                }
                return false;
            },
            "external-link"
        )
    };

    new Spicetify.ContextMenu.SubMenu(
        "Web links",
        links.map((link) => buildContextMenuItem(link)),
        (uris) => {
            if (uris.length === 1) {
                const uriObj = Spicetify.URI.fromString(uris[0]);
                switch (uriObj.type) {
                    case Spicetify.URI.Type.ARTIST:
                    case Spicetify.URI.Type.ALBUM:
                    case Spicetify.URI.Type.TRACK:
                        return true;
                }
            }
            // User selects multiple tracks in a list.
            return false;
        }
    ).register();

    const fetchArtist = async (uriBase62) => {
        return await Spicetify.CosmosAsync.get(`hm://artist/v1/${uriBase62}/desktop?format=json`);
    };

    const fetchAlbum = async (uriBase62) => {
        return await Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${uriBase62}/desktop`)
    };

    const fetchTrack = async (uriBase62) => {
        return await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${uriBase62}`);
    };
})();