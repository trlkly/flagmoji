;
(function (local_setup) {

    /**
     * @global
     * @namespace
     */
    function emoji() {
    }

    /**
     * The set of images to use for graphical emoji.
     *
     * @memberof emoji
     * @type {string}
     */
    emoji.img_set = 'apple';

    /**
     * Configuration details for different image sets. This includes a path to a directory containing the
     * individual images (`path`) and a URL to sprite sheets (`sheet`). All of these images can be found
     * in the [emoji-data repository]{@link https://github.com/iamcal/emoji-data}. Using a CDN for these
     * is not a bad idea.
     *
     * @memberof emoji
     * @type {
	 */
    emoji.img_sets = {
        'apple': {'path': '/emoji-data/img-apple-64/', 'sheet': '/emoji-data/sheet_apple_64.png', 'mask': 1},
        'google': {'path': '/emoji-data/img-google-64/', 'sheet': '/emoji-data/sheet_google_64.png', 'mask': 2},
        'twitter': {'path': '/emoji-data/img-twitter-64/', 'sheet': '/emoji-data/sheet_twitter_64.png', 'mask': 4},
        'emojione': {'path': '/emoji-data/img-emojione-64/', 'sheet': '/emoji-data/sheet_emojione_64.png', 'mask': 8}
    };

    /**
     * Use a CSS class instead of specifying a sprite or background image for
     * the span representing the emoticon. This requires a CSS sheet with
     * emoticon data-uris.
     *
     * @memberof emoji
     * @type bool
     * @todo document how to build the CSS stylesheet this requires.
     */
    emoji.use_css_imgs = false;

    /**
     * Instead of replacing emoticons with the appropriate representations,
     * replace them with their colon string representation.
     * @memberof emoji
     * @type bool
     */
    emoji.colons_mode = false;
    emoji.text_mode = false;

    /**
     * If true, sets the "title" property on the span or image that gets
     * inserted for the emoticon.
     * @memberof emoji
     * @type bool
     */
    emoji.include_title = false;

    /**
     * If the platform supports native emoticons, use those instead
     * of the fallbacks.
     * @memberof emoji
     * @type bool
     */
    emoji.allow_native = true;

    /**
     * Set to true to use CSS sprites instead of individual images on
     * platforms that support it.
     *
     * @memberof emoji
     * @type bool
     */
    emoji.use_sheet = false;

    /**
     *
     * Set to true to avoid black & white native Windows emoji being used.
     *
     * @memberof emoji
     * @type bool
     */
    emoji.avoid_ms_emoji = true;

    // Keeps track of what has been initialized.
    /** @private */
    emoji.inits = {};
    emoji.map = {};

    /**
     * @memberof emoji
     * @param {string} str A string potentially containing ascii emoticons
     * (ie. `:)`)
     *
     * @returns {string} A new string with all emoticons in `str`
     * replaced by a representatation that's supported by the current
     * environtment.
     */
    emoji.replace_emoticons = function (str) {
        emoji.init_emoticons();
        return str.replace(emoji.rx_emoticons, function (m, $1, $2) {
            var val = emoji.map.emoticons[$2];
            return val ? $1 + emoji.replacement(val, $2) : m;
        });
    };

    /**
     * @memberof emoji
     * @param {string} str A string potentially containing ascii emoticons
     * (ie. `:)`)
     *
     * @returns {string} A new string with all emoticons in `str`
     * replaced by their colon string representations (ie. `:smile:`)
     */
    emoji.replace_emoticons_with_colons = function (str) {
        emoji.init_emoticons();
        return str.replace(emoji.rx_emoticons, function (m, $1, $2) {
            var val = emoji.data[emoji.map.emoticons[$2]][3][0];
            return val ? $1 + ':' + val + ':' : m;
        });
    };

    /**
     * @memberof emoji
     * @param {string} str A string potentially containing colon string
     * representations of emoticons (ie. `:smile:`)
     *
     * @returns {string} A new string with all colon string emoticons replaced
     * with the appropriate representation.
     */
    emoji.replace_colons = function (str) {
        emoji.init_colons();

        return str.replace(emoji.rx_colons, function (m) {
            var idx = m.substr(1, m.length - 2);

            // special case - an emoji with a skintone modified
            if (idx.indexOf('::skin-tone-') > -1) {

                var skin_tone = idx.substr(-1, 1);
                var skin_idx = 'skin-tone-' + skin_tone;
                var skin_val = emoji.map.colons[skin_idx];

                idx = idx.substr(0, idx.length - 13);

                var val = emoji.map.colons[idx];
                if (val) {
                    return emoji.replacement(val, idx, ':', {
                        'idx': skin_val,
                        'actual': skin_idx,
                        'wrapper': ':'
                    });
                } else {
                    return ':' + idx + ':' + emoji.replacement(skin_val, skin_idx, ':');
                }
            } else {
                var val = emoji.map.colons[idx];
                return val ? emoji.replacement(val, idx, ':') : m;
            }
        });
    };

    /**
     * @memberof emoji
     * @param {string} str A string potentially containing unified unicode
     * emoticons. (ie. 😄)
     *
     * @returns {string} A new string with all unicode emoticons replaced with
     * the appropriate representation for the current environment.
     */
    emoji.replace_unified = function (str) {
        emoji.init_unified();
        return str.replace(emoji.rx_unified, function (m, p1, p2) {
            var val = emoji.map.unified[p1];
            if (!val) return m;
            var idx = null;
            if (p2 == '\uD83C\uDFFB') idx = '1f3fb';
            if (p2 == '\uD83C\uDFFC') idx = '1f3fc';
            if (p2 == '\uD83C\uDFFD') idx = '1f3fd';
            if (p2 == '\uD83C\uDFFE') idx = '1f3fe';
            if (p2 == '\uD83C\uDFFF') idx = '1f3ff';
            if (idx) {
                return emoji.replacement(val, null, null, {
                    idx: idx,
                    actual: p2,
                    wrapper: ''
                }, m);
            }
            return emoji.replacement(val, undefined, undefined, undefined, m);
        });
    };

    // Does the actual replacement of a character with the appropriate
    /** @private */
    emoji.replacement = function (idx, actual, wrapper, variation, matched) {

        // for emoji with variation modifiers, set `etxra` to the standalone output for the
        // modifier (used if we can't combine the glyph) and set variation_idx to key of the
        // variation modifier (used below)
        var extra = '';
        var variation_idx = 0;
        if (typeof variation === 'object') {
            extra = emoji.replacement(variation.idx, variation.actual, variation.wrapper);
            variation_idx = idx + '-' + variation.idx;
        }

        // deal with simple modes (colons and text) first
        wrapper = wrapper || '';
        if (emoji.colons_mode) return ':' + emoji.data[idx][3][0] + ':' + extra;
        var text_name = (actual) ? wrapper + actual + wrapper : emoji.data[idx][8] || wrapper + emoji.data[idx][3][0] + wrapper;
        if (emoji.text_mode) return text_name + extra;

        // native modes next.
        // for variations selectors, we just need to output them raw, which `extra` will contain.
        emoji.init_env();
        if (emoji.replace_mode == 'unified' && emoji.allow_native && emoji.data[idx][0][0]) return emoji.data[idx][0][0] + extra;
        if (emoji.replace_mode == 'softbank' && emoji.allow_native && emoji.data[idx][1]) return emoji.data[idx][1] + extra;
        if (emoji.replace_mode == 'google' && emoji.allow_native && emoji.data[idx][2]) return emoji.data[idx][2] + extra;

        // finally deal with image modes.
        // variation selectors are more complex here - if the image set and particular emoji supports variations, then
        // use the variation image. otherwise, return it as a separate image (already calculated in `extra`).
        // first we set up the params we'll use if we can't use a variation.
        var img = emoji.data[idx][7] || emoji.img_sets[emoji.img_set].path + idx + '.png';
        var title = emoji.include_title ? ' title="' + (actual || emoji.data[idx][3][0]) + '"' : '';
        var text = emoji.include_text ? wrapper + (actual || emoji.data[idx][3][0]) + wrapper : matched;
        var px = emoji.data[idx][4];
        var py = emoji.data[idx][5];

        // now we'll see if we can use a varition. if we can, we can override the params above and blank
        // out `extra` so we output a sinlge glyph.
        // we need to check that:
        //  * we requested a variation
        //  * such a variation exists in `emoji.variations_data`
        //  * we're not using a custom image for this glyph
        //  * the variation has an image defined for the current image set
        if (variation_idx && emoji.variations_data[variation_idx] && emoji.variations_data[variation_idx][2] && !emoji.data[idx][9]) {
            if (emoji.variations_data[variation_idx][2]) {
                img = emoji.img_sets[emoji.img_set].path + variation_idx + '.png';
                px = emoji.variations_data[variation_idx][0];
                py = emoji.variations_data[variation_idx][1];
                extra = '';
            }
        }

        if (emoji.supports_css) {
            if (emoji.use_sheet && px != null && py != null) {
                var mul = 100 / (emoji.sheet_size - 1);
                var style = 'background: url(' + emoji.img_sets[emoji.img_set].sheet + ');background-position:' + (mul * px) + '% ' + (mul * py) + '%;background-size:' + emoji.sheet_size + '00%';
                return '<span class="emoji-outer emoji-sizer"><span class="emoji-inner" style="' + style + '"' + title + '>' + text + '</span></span>' + extra;
            } else if (emoji.use_css_imgs) {
                return '<span class="emoji emoji-' + idx + '"' + title + '>' + text + '</span>' + extra;
            } else {
                return '<span class="emoji emoji-sizer" style="background-image:url(' + img + ')"' + title + '>' + text + '</span>' + extra;
            }
        }
        return '<img src="' + img + '" class="emoji" ' + title + '/>' + extra;
    };

    // Initializes the text emoticon data
    /** @private */
    emoji.init_emoticons = function () {
        if (emoji.inits.emoticons) return;
        emoji.init_colons(); // we require this for the emoticons map
        emoji.inits.emoticons = 1;

        var a = [];
        emoji.map.emoticons = {};
        for (var i in emoji.emoticons_data) {
            // because we never see some characters in our text except as entities, we must do some replacing
            var emoticon = i.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');

            if (!emoji.map.colons[emoji.emoticons_data[i]]) continue;

            emoji.map.emoticons[emoticon] = emoji.map.colons[emoji.emoticons_data[i]];
            a.push(emoji.escape_rx(emoticon));
        }
        emoji.rx_emoticons = new RegExp(('(^|\\s)(' + a.join('|') + ')(?=$|[\\s|\\?\\.,!])'), 'g');
    };

    // Initializes the colon string data
    /** @private */
    emoji.init_colons = function () {
        if (emoji.inits.colons) return;
        emoji.inits.colons = 1;
        emoji.rx_colons = new RegExp('\:[a-zA-Z0-9-_+]+\:(\:skin-tone-[2-6]\:)?', 'g');
        emoji.map.colons = {};
        for (var i in emoji.data) {
            for (var j = 0; j < emoji.data[i][3].length; j++) {
                emoji.map.colons[emoji.data[i][3][j]] = i;
            }
        }
    };

    // initializes the unified unicode emoticon data
    /** @private */
    emoji.init_unified = function () {
        if (emoji.inits.unified) return;
        emoji.inits.unified = 1;

        var a = [];
        emoji.map.unified = {};

        for (var i in emoji.data) {
            for (var j = 0; j < emoji.data[i][0].length; j++) {
                a.push(emoji.data[i][0][j].replace('*', '\\*'));
                emoji.map.unified[emoji.data[i][0][j]] = i;
            }
        }

        a = a.sort(function (a, b) {
            return b.length - a.length;
        });

        emoji.rx_unified = new RegExp('(' + a.join('|') + ')(\uD83C[\uDFFB-\uDFFF])?', "g");
    };

    // initializes the environment, figuring out what representation
    // of emoticons is best.
    /** @private */
    emoji.init_env = function () {
        if (emoji.inits.env) return;
        emoji.inits.env = 1;
        emoji.replace_mode = 'img';
        emoji.supports_css = false;
        if (typeof(navigator) !== 'undefined') {
            var ua = navigator.userAgent;
            if (window.getComputedStyle) {
                var st = window.getComputedStyle(document.body);
                if (st['background-size'] || st['backgroundSize']) {
                    emoji.supports_css = true;
                }
            }
            if (ua.match(/(iPhone|iPod|iPad|iPhone\s+Simulator)/i)) {
                if (ua.match(/OS\s+[12345]/i)) {
                    emoji.replace_mode = 'softbank';
                    return;
                }
                if (ua.match(/OS\s+[6789]/i)) {
                    emoji.replace_mode = 'unified';
                    return;
                }
            }
            if (ua.match(/Mac OS X 10[._ ](?:[789]|1\d)/i)) {
                if (!ua.match(/Chrome/i) && !ua.match(/Firefox/i)) {
                    emoji.replace_mode = 'unified';
                    return;
                }
            }
            if (!emoji.avoid_ms_emoji) {
                if (ua.match(/Windows NT 6.[1-9]/i) || ua.match(/Windows NT 10.[0-9]/i)) {
                    if (!ua.match(/Chrome/i) && !ua.match(/MSIE 8/i)) {
                        emoji.replace_mode = 'unified';
                        return;
                    }
                }
            }
        }

        // Need a better way to detect android devices that actually
        // support emoji.
        if (false && ua.match(/Android/i)) {
            emoji.replace_mode = 'google';
            return;
        }
        if (emoji.supports_css) {
            emoji.replace_mode = 'css';
        }
        // nothing fancy detected - use images
    };
    /** @private */
    emoji.escape_rx = function (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };
    emoji.sheet_size = 60;

    emoji.data = {
		"1f1e6-1f1e8":[["\uD83C\uDDE6\uD83C\uDDE8"],"","",["flag-ac"],0,31,15,0],
		"1f1e6-1f1e9":[["\uD83C\uDDE6\uD83C\uDDE9"],"","",["flag-ad"],0,32,15,0],
		"1f1e6-1f1ea":[["\uD83C\uDDE6\uD83C\uDDEA"],"","",["flag-ae"],0,33,15,0],
		"1f1e6-1f1eb":[["\uD83C\uDDE6\uD83C\uDDEB"],"","",["flag-af"],0,34,15,0],
		"1f1e6-1f1ec":[["\uD83C\uDDE6\uD83C\uDDEC"],"","",["flag-ag"],0,35,15,0],
		"1f1e6-1f1ee":[["\uD83C\uDDE6\uD83C\uDDEE"],"","",["flag-ai"],0,36,15,0],
		"1f1e6-1f1f1":[["\uD83C\uDDE6\uD83C\uDDF1"],"","",["flag-al"],0,37,15,0],
		"1f1e6-1f1f2":[["\uD83C\uDDE6\uD83C\uDDF2"],"","",["flag-am"],0,38,15,0],
		"1f1e6-1f1f4":[["\uD83C\uDDE6\uD83C\uDDF4"],"","",["flag-ao"],0,39,15,0],
		"1f1e6-1f1f6":[["\uD83C\uDDE6\uD83C\uDDF6"],"","",["flag-aq"],0,40,15,0],
		"1f1e6-1f1f7":[["\uD83C\uDDE6\uD83C\uDDF7"],"","",["flag-ar"],0,41,15,0],
		"1f1e6-1f1f8":[["\uD83C\uDDE6\uD83C\uDDF8"],"","",["flag-as"],0,42,15,0],
		"1f1e6-1f1f9":[["\uD83C\uDDE6\uD83C\uDDF9"],"","",["flag-at"],0,43,15,0],
		"1f1e6-1f1fa":[["\uD83C\uDDE6\uD83C\uDDFA"],"","",["flag-au"],0,44,15,0],
		"1f1e6-1f1fc":[["\uD83C\uDDE6\uD83C\uDDFC"],"","",["flag-aw"],0,45,15,0],
		"1f1e6-1f1fd":[["\uD83C\uDDE6\uD83C\uDDFD"],"","",["flag-ax"],0,46,15,0],
		"1f1e6-1f1ff":[["\uD83C\uDDE6\uD83C\uDDFF"],"","",["flag-az"],0,47,15,0],
		"1f1e7-1f1e6":[["\uD83C\uDDE7\uD83C\uDDE6"],"","",["flag-ba"],0,48,15,0],
		"1f1e7-1f1e7":[["\uD83C\uDDE7\uD83C\uDDE7"],"","",["flag-bb"],0,49,15,0],
		"1f1e7-1f1e9":[["\uD83C\uDDE7\uD83C\uDDE9"],"","",["flag-bd"],0,50,15,0],
		"1f1e7-1f1ea":[["\uD83C\uDDE7\uD83C\uDDEA"],"","",["flag-be"],0,51,15,0],
		"1f1e7-1f1eb":[["\uD83C\uDDE7\uD83C\uDDEB"],"","",["flag-bf"],0,52,15,0],
		"1f1e7-1f1ec":[["\uD83C\uDDE7\uD83C\uDDEC"],"","",["flag-bg"],0,53,15,0],
		"1f1e7-1f1ed":[["\uD83C\uDDE7\uD83C\uDDED"],"","",["flag-bh"],0,54,15,0],
		"1f1e7-1f1ee":[["\uD83C\uDDE7\uD83C\uDDEE"],"","",["flag-bi"],0,55,15,0],
		"1f1e7-1f1ef":[["\uD83C\uDDE7\uD83C\uDDEF"],"","",["flag-bj"],0,56,15,0],
		"1f1e7-1f1f1":[["\uD83C\uDDE7\uD83C\uDDF1"],"","",["flag-bl"],0,57,15,0],
		"1f1e7-1f1f2":[["\uD83C\uDDE7\uD83C\uDDF2"],"","",["flag-bm"],0,58,15,0],
		"1f1e7-1f1f3":[["\uD83C\uDDE7\uD83C\uDDF3"],"","",["flag-bn"],0,59,15,0],
		"1f1e7-1f1f4":[["\uD83C\uDDE7\uD83C\uDDF4"],"","",["flag-bo"],1,0,15,0],
		"1f1e7-1f1f6":[["\uD83C\uDDE7\uD83C\uDDF6"],"","",["flag-bq"],1,1,15,0],
		"1f1e7-1f1f7":[["\uD83C\uDDE7\uD83C\uDDF7"],"","",["flag-br"],1,2,15,0],
		"1f1e7-1f1f8":[["\uD83C\uDDE7\uD83C\uDDF8"],"","",["flag-bs"],1,3,15,0],
		"1f1e7-1f1f9":[["\uD83C\uDDE7\uD83C\uDDF9"],"","",["flag-bt"],1,4,15,0],
		"1f1e7-1f1fb":[["\uD83C\uDDE7\uD83C\uDDFB"],"","",["flag-bv"],1,5,15,0],
		"1f1e7-1f1fc":[["\uD83C\uDDE7\uD83C\uDDFC"],"","",["flag-bw"],1,6,15,0],
		"1f1e7-1f1fe":[["\uD83C\uDDE7\uD83C\uDDFE"],"","",["flag-by"],1,7,15,0],
		"1f1e7-1f1ff":[["\uD83C\uDDE7\uD83C\uDDFF"],"","",["flag-bz"],1,8,15,0],
		"1f1e8-1f1e6":[["\uD83C\uDDE8\uD83C\uDDE6"],"","",["flag-ca"],1,9,15,0],
		"1f1e8-1f1e8":[["\uD83C\uDDE8\uD83C\uDDE8"],"","",["flag-cc"],1,10,15,0],
		"1f1e8-1f1e9":[["\uD83C\uDDE8\uD83C\uDDE9"],"","",["flag-cd"],1,11,15,0],
		"1f1e8-1f1eb":[["\uD83C\uDDE8\uD83C\uDDEB"],"","",["flag-cf"],1,12,15,0],
		"1f1e8-1f1ec":[["\uD83C\uDDE8\uD83C\uDDEC"],"","",["flag-cg"],1,13,15,0],
		"1f1e8-1f1ed":[["\uD83C\uDDE8\uD83C\uDDED"],"","",["flag-ch"],1,14,15,0],
		"1f1e8-1f1ee":[["\uD83C\uDDE8\uD83C\uDDEE"],"","",["flag-ci"],1,15,15,0],
		"1f1e8-1f1f0":[["\uD83C\uDDE8\uD83C\uDDF0"],"","",["flag-ck"],1,16,15,0],
		"1f1e8-1f1f1":[["\uD83C\uDDE8\uD83C\uDDF1"],"","",["flag-cl"],1,17,15,0],
		"1f1e8-1f1f2":[["\uD83C\uDDE8\uD83C\uDDF2"],"","",["flag-cm"],1,18,15,0],
		"1f1e8-1f1f3":[["\uD83C\uDDE8\uD83C\uDDF3"],"\uE513","\uDBB9\uDCED",["cn","flag-cn"],1,19,15,0],
		"1f1e8-1f1f4":[["\uD83C\uDDE8\uD83C\uDDF4"],"","",["flag-co"],1,20,15,0],
		"1f1e8-1f1f5":[["\uD83C\uDDE8\uD83C\uDDF5"],"","",["flag-cp"],1,21,15,0],
		"1f1e8-1f1f7":[["\uD83C\uDDE8\uD83C\uDDF7"],"","",["flag-cr"],1,22,15,0],
		"1f1e8-1f1fa":[["\uD83C\uDDE8\uD83C\uDDFA"],"","",["flag-cu"],1,23,15,0],
		"1f1e8-1f1fb":[["\uD83C\uDDE8\uD83C\uDDFB"],"","",["flag-cv"],1,24,15,0],
		"1f1e8-1f1fc":[["\uD83C\uDDE8\uD83C\uDDFC"],"","",["flag-cw"],1,25,15,0],
		"1f1e8-1f1fd":[["\uD83C\uDDE8\uD83C\uDDFD"],"","",["flag-cx"],1,26,15,0],
		"1f1e8-1f1fe":[["\uD83C\uDDE8\uD83C\uDDFE"],"","",["flag-cy"],1,27,15,0],
		"1f1e8-1f1ff":[["\uD83C\uDDE8\uD83C\uDDFF"],"","",["flag-cz"],1,28,15,0],
		"1f1e9-1f1ea":[["\uD83C\uDDE9\uD83C\uDDEA"],"\uE50E","\uDBB9\uDCE8",["de","flag-de"],1,29,15,0],
		"1f1e9-1f1ec":[["\uD83C\uDDE9\uD83C\uDDEC"],"","",["flag-dg"],1,30,15,0],
		"1f1e9-1f1ef":[["\uD83C\uDDE9\uD83C\uDDEF"],"","",["flag-dj"],1,31,15,0],
		"1f1e9-1f1f0":[["\uD83C\uDDE9\uD83C\uDDF0"],"","",["flag-dk"],1,32,15,0],
		"1f1e9-1f1f2":[["\uD83C\uDDE9\uD83C\uDDF2"],"","",["flag-dm"],1,33,15,0],
		"1f1e9-1f1f4":[["\uD83C\uDDE9\uD83C\uDDF4"],"","",["flag-do"],1,34,15,0],
		"1f1e9-1f1ff":[["\uD83C\uDDE9\uD83C\uDDFF"],"","",["flag-dz"],1,35,15,0],
		"1f1ea-1f1e6":[["\uD83C\uDDEA\uD83C\uDDE6"],"","",["flag-ea"],1,36,15,0],
		"1f1ea-1f1e8":[["\uD83C\uDDEA\uD83C\uDDE8"],"","",["flag-ec"],1,37,15,0],
		"1f1ea-1f1ea":[["\uD83C\uDDEA\uD83C\uDDEA"],"","",["flag-ee"],1,38,15,0],
		"1f1ea-1f1ec":[["\uD83C\uDDEA\uD83C\uDDEC"],"","",["flag-eg"],1,39,15,0],
		"1f1ea-1f1ed":[["\uD83C\uDDEA\uD83C\uDDED"],"","",["flag-eh"],1,40,15,0],
		"1f1ea-1f1f7":[["\uD83C\uDDEA\uD83C\uDDF7"],"","",["flag-er"],1,41,15,0],
		"1f1ea-1f1f8":[["\uD83C\uDDEA\uD83C\uDDF8"],"\uE511","\uDBB9\uDCEB",["es","flag-es"],1,42,15,0],
		"1f1ea-1f1f9":[["\uD83C\uDDEA\uD83C\uDDF9"],"","",["flag-et"],1,43,15,0],
		"1f1ea-1f1fa":[["\uD83C\uDDEA\uD83C\uDDFA"],"","",["flag-eu"],1,44,15,0],
		"1f1eb-1f1ee":[["\uD83C\uDDEB\uD83C\uDDEE"],"","",["flag-fi"],1,45,15,0],
		"1f1eb-1f1ef":[["\uD83C\uDDEB\uD83C\uDDEF"],"","",["flag-fj"],1,46,15,0],
		"1f1eb-1f1f0":[["\uD83C\uDDEB\uD83C\uDDF0"],"","",["flag-fk"],1,47,15,0],
		"1f1eb-1f1f2":[["\uD83C\uDDEB\uD83C\uDDF2"],"","",["flag-fm"],1,48,15,0],
		"1f1eb-1f1f4":[["\uD83C\uDDEB\uD83C\uDDF4"],"","",["flag-fo"],1,49,15,0],
		"1f1eb-1f1f7":[["\uD83C\uDDEB\uD83C\uDDF7"],"\uE50D","\uDBB9\uDCE7",["fr","flag-fr"],1,50,15,0],
		"1f1ec-1f1e6":[["\uD83C\uDDEC\uD83C\uDDE6"],"","",["flag-ga"],1,51,15,0],
		"1f1ec-1f1e7":[["\uD83C\uDDEC\uD83C\uDDE7"],"\uE510","\uDBB9\uDCEA",["gb","uk","flag-gb"],1,52,15,0],
		"1f1ec-1f1e9":[["\uD83C\uDDEC\uD83C\uDDE9"],"","",["flag-gd"],1,53,15,0],
		"1f1ec-1f1ea":[["\uD83C\uDDEC\uD83C\uDDEA"],"","",["flag-ge"],1,54,15,0],
		"1f1ec-1f1eb":[["\uD83C\uDDEC\uD83C\uDDEB"],"","",["flag-gf"],1,55,15,0],
		"1f1ec-1f1ec":[["\uD83C\uDDEC\uD83C\uDDEC"],"","",["flag-gg"],1,56,15,0],
		"1f1ec-1f1ed":[["\uD83C\uDDEC\uD83C\uDDED"],"","",["flag-gh"],1,57,15,0],
		"1f1ec-1f1ee":[["\uD83C\uDDEC\uD83C\uDDEE"],"","",["flag-gi"],1,58,15,0],
		"1f1ec-1f1f1":[["\uD83C\uDDEC\uD83C\uDDF1"],"","",["flag-gl"],1,59,15,0],
		"1f1ec-1f1f2":[["\uD83C\uDDEC\uD83C\uDDF2"],"","",["flag-gm"],2,0,15,0],
		"1f1ec-1f1f3":[["\uD83C\uDDEC\uD83C\uDDF3"],"","",["flag-gn"],2,1,15,0],
		"1f1ec-1f1f5":[["\uD83C\uDDEC\uD83C\uDDF5"],"","",["flag-gp"],2,2,15,0],
		"1f1ec-1f1f6":[["\uD83C\uDDEC\uD83C\uDDF6"],"","",["flag-gq"],2,3,15,0],
		"1f1ec-1f1f7":[["\uD83C\uDDEC\uD83C\uDDF7"],"","",["flag-gr"],2,4,15,0],
		"1f1ec-1f1f8":[["\uD83C\uDDEC\uD83C\uDDF8"],"","",["flag-gs"],2,5,15,0],
		"1f1ec-1f1f9":[["\uD83C\uDDEC\uD83C\uDDF9"],"","",["flag-gt"],2,6,15,0],
		"1f1ec-1f1fa":[["\uD83C\uDDEC\uD83C\uDDFA"],"","",["flag-gu"],2,7,15,0],
		"1f1ec-1f1fc":[["\uD83C\uDDEC\uD83C\uDDFC"],"","",["flag-gw"],2,8,15,0],
		"1f1ec-1f1fe":[["\uD83C\uDDEC\uD83C\uDDFE"],"","",["flag-gy"],2,9,15,0],
		"1f1ed-1f1f0":[["\uD83C\uDDED\uD83C\uDDF0"],"","",["flag-hk"],2,10,15,0],
		"1f1ed-1f1f2":[["\uD83C\uDDED\uD83C\uDDF2"],"","",["flag-hm"],2,11,15,0],
		"1f1ed-1f1f3":[["\uD83C\uDDED\uD83C\uDDF3"],"","",["flag-hn"],2,12,15,0],
		"1f1ed-1f1f7":[["\uD83C\uDDED\uD83C\uDDF7"],"","",["flag-hr"],2,13,15,0],
		"1f1ed-1f1f9":[["\uD83C\uDDED\uD83C\uDDF9"],"","",["flag-ht"],2,14,15,0],
		"1f1ed-1f1fa":[["\uD83C\uDDED\uD83C\uDDFA"],"","",["flag-hu"],2,15,15,0],
		"1f1ee-1f1e8":[["\uD83C\uDDEE\uD83C\uDDE8"],"","",["flag-ic"],2,16,15,0],
		"1f1ee-1f1e9":[["\uD83C\uDDEE\uD83C\uDDE9"],"","",["flag-id"],2,17,15,0],
		"1f1ee-1f1ea":[["\uD83C\uDDEE\uD83C\uDDEA"],"","",["flag-ie"],2,18,15,0],
		"1f1ee-1f1f1":[["\uD83C\uDDEE\uD83C\uDDF1"],"","",["flag-il"],2,19,15,0],
		"1f1ee-1f1f2":[["\uD83C\uDDEE\uD83C\uDDF2"],"","",["flag-im"],2,20,15,0],
		"1f1ee-1f1f3":[["\uD83C\uDDEE\uD83C\uDDF3"],"","",["flag-in"],2,21,15,0],
		"1f1ee-1f1f4":[["\uD83C\uDDEE\uD83C\uDDF4"],"","",["flag-io"],2,22,15,0],
		"1f1ee-1f1f6":[["\uD83C\uDDEE\uD83C\uDDF6"],"","",["flag-iq"],2,23,15,0],
		"1f1ee-1f1f7":[["\uD83C\uDDEE\uD83C\uDDF7"],"","",["flag-ir"],2,24,15,0],
		"1f1ee-1f1f8":[["\uD83C\uDDEE\uD83C\uDDF8"],"","",["flag-is"],2,25,15,0],
		"1f1ee-1f1f9":[["\uD83C\uDDEE\uD83C\uDDF9"],"\uE50F","\uDBB9\uDCE9",["it","flag-it"],2,26,15,0],
		"1f1ef-1f1ea":[["\uD83C\uDDEF\uD83C\uDDEA"],"","",["flag-je"],2,27,15,0],
		"1f1ef-1f1f2":[["\uD83C\uDDEF\uD83C\uDDF2"],"","",["flag-jm"],2,28,15,0],
		"1f1ef-1f1f4":[["\uD83C\uDDEF\uD83C\uDDF4"],"","",["flag-jo"],2,29,15,0],
		"1f1ef-1f1f5":[["\uD83C\uDDEF\uD83C\uDDF5"],"\uE50B","\uDBB9\uDCE5",["jp","flag-jp"],2,30,15,0],
		"1f1f0-1f1ea":[["\uD83C\uDDF0\uD83C\uDDEA"],"","",["flag-ke"],2,31,15,0],
		"1f1f0-1f1ec":[["\uD83C\uDDF0\uD83C\uDDEC"],"","",["flag-kg"],2,32,15,0],
		"1f1f0-1f1ed":[["\uD83C\uDDF0\uD83C\uDDED"],"","",["flag-kh"],2,33,15,0],
		"1f1f0-1f1ee":[["\uD83C\uDDF0\uD83C\uDDEE"],"","",["flag-ki"],2,34,15,0],
		"1f1f0-1f1f2":[["\uD83C\uDDF0\uD83C\uDDF2"],"","",["flag-km"],2,35,15,0],
		"1f1f0-1f1f3":[["\uD83C\uDDF0\uD83C\uDDF3"],"","",["flag-kn"],2,36,15,0],
		"1f1f0-1f1f5":[["\uD83C\uDDF0\uD83C\uDDF5"],"","",["flag-kp"],2,37,15,0],
		"1f1f0-1f1f7":[["\uD83C\uDDF0\uD83C\uDDF7"],"\uE514","\uDBB9\uDCEE",["kr","flag-kr"],2,38,15,0],
		"1f1f0-1f1fc":[["\uD83C\uDDF0\uD83C\uDDFC"],"","",["flag-kw"],2,39,15,0],
		"1f1f0-1f1fe":[["\uD83C\uDDF0\uD83C\uDDFE"],"","",["flag-ky"],2,40,15,0],
		"1f1f0-1f1ff":[["\uD83C\uDDF0\uD83C\uDDFF"],"","",["flag-kz"],2,41,15,0],
		"1f1f1-1f1e6":[["\uD83C\uDDF1\uD83C\uDDE6"],"","",["flag-la"],2,42,15,0],
		"1f1f1-1f1e7":[["\uD83C\uDDF1\uD83C\uDDE7"],"","",["flag-lb"],2,43,15,0],
		"1f1f1-1f1e8":[["\uD83C\uDDF1\uD83C\uDDE8"],"","",["flag-lc"],2,44,15,0],
		"1f1f1-1f1ee":[["\uD83C\uDDF1\uD83C\uDDEE"],"","",["flag-li"],2,45,15,0],
		"1f1f1-1f1f0":[["\uD83C\uDDF1\uD83C\uDDF0"],"","",["flag-lk"],2,46,15,0],
		"1f1f1-1f1f7":[["\uD83C\uDDF1\uD83C\uDDF7"],"","",["flag-lr"],2,47,15,0],
		"1f1f1-1f1f8":[["\uD83C\uDDF1\uD83C\uDDF8"],"","",["flag-ls"],2,48,15,0],
		"1f1f1-1f1f9":[["\uD83C\uDDF1\uD83C\uDDF9"],"","",["flag-lt"],2,49,15,0],
		"1f1f1-1f1fa":[["\uD83C\uDDF1\uD83C\uDDFA"],"","",["flag-lu"],2,50,15,0],
		"1f1f1-1f1fb":[["\uD83C\uDDF1\uD83C\uDDFB"],"","",["flag-lv"],2,51,15,0],
		"1f1f1-1f1fe":[["\uD83C\uDDF1\uD83C\uDDFE"],"","",["flag-ly"],2,52,15,0],
		"1f1f2-1f1e6":[["\uD83C\uDDF2\uD83C\uDDE6"],"","",["flag-ma"],2,53,15,0],
		"1f1f2-1f1e8":[["\uD83C\uDDF2\uD83C\uDDE8"],"","",["flag-mc"],2,54,15,0],
		"1f1f2-1f1e9":[["\uD83C\uDDF2\uD83C\uDDE9"],"","",["flag-md"],2,55,15,0],
		"1f1f2-1f1ea":[["\uD83C\uDDF2\uD83C\uDDEA"],"","",["flag-me"],2,56,15,0],
		"1f1f2-1f1eb":[["\uD83C\uDDF2\uD83C\uDDEB"],"","",["flag-mf"],2,57,15,0],
		"1f1f2-1f1ec":[["\uD83C\uDDF2\uD83C\uDDEC"],"","",["flag-mg"],2,58,15,0],
		"1f1f2-1f1ed":[["\uD83C\uDDF2\uD83C\uDDED"],"","",["flag-mh"],2,59,15,0],
		"1f1f2-1f1f0":[["\uD83C\uDDF2\uD83C\uDDF0"],"","",["flag-mk"],3,0,15,0],
		"1f1f2-1f1f1":[["\uD83C\uDDF2\uD83C\uDDF1"],"","",["flag-ml"],3,1,15,0],
		"1f1f2-1f1f2":[["\uD83C\uDDF2\uD83C\uDDF2"],"","",["flag-mm"],3,2,15,0],
		"1f1f2-1f1f3":[["\uD83C\uDDF2\uD83C\uDDF3"],"","",["flag-mn"],3,3,15,0],
		"1f1f2-1f1f4":[["\uD83C\uDDF2\uD83C\uDDF4"],"","",["flag-mo"],3,4,15,0],
		"1f1f2-1f1f5":[["\uD83C\uDDF2\uD83C\uDDF5"],"","",["flag-mp"],3,5,15,0],
		"1f1f2-1f1f6":[["\uD83C\uDDF2\uD83C\uDDF6"],"","",["flag-mq"],3,6,15,0],
		"1f1f2-1f1f7":[["\uD83C\uDDF2\uD83C\uDDF7"],"","",["flag-mr"],3,7,15,0],
		"1f1f2-1f1f8":[["\uD83C\uDDF2\uD83C\uDDF8"],"","",["flag-ms"],3,8,15,0],
		"1f1f2-1f1f9":[["\uD83C\uDDF2\uD83C\uDDF9"],"","",["flag-mt"],3,9,15,0],
		"1f1f2-1f1fa":[["\uD83C\uDDF2\uD83C\uDDFA"],"","",["flag-mu"],3,10,15,0],
		"1f1f2-1f1fb":[["\uD83C\uDDF2\uD83C\uDDFB"],"","",["flag-mv"],3,11,15,0],
		"1f1f2-1f1fc":[["\uD83C\uDDF2\uD83C\uDDFC"],"","",["flag-mw"],3,12,15,0],
		"1f1f2-1f1fd":[["\uD83C\uDDF2\uD83C\uDDFD"],"","",["flag-mx"],3,13,15,0],
		"1f1f2-1f1fe":[["\uD83C\uDDF2\uD83C\uDDFE"],"","",["flag-my"],3,14,15,0],
		"1f1f2-1f1ff":[["\uD83C\uDDF2\uD83C\uDDFF"],"","",["flag-mz"],3,15,15,0],
		"1f1f3-1f1e6":[["\uD83C\uDDF3\uD83C\uDDE6"],"","",["flag-na"],3,16,15,0],
		"1f1f3-1f1e8":[["\uD83C\uDDF3\uD83C\uDDE8"],"","",["flag-nc"],3,17,15,0],
		"1f1f3-1f1ea":[["\uD83C\uDDF3\uD83C\uDDEA"],"","",["flag-ne"],3,18,15,0],
		"1f1f3-1f1eb":[["\uD83C\uDDF3\uD83C\uDDEB"],"","",["flag-nf"],3,19,15,0],
		"1f1f3-1f1ec":[["\uD83C\uDDF3\uD83C\uDDEC"],"","",["flag-ng"],3,20,15,0],
		"1f1f3-1f1ee":[["\uD83C\uDDF3\uD83C\uDDEE"],"","",["flag-ni"],3,21,15,0],
		"1f1f3-1f1f1":[["\uD83C\uDDF3\uD83C\uDDF1"],"","",["flag-nl"],3,22,15,0],
		"1f1f3-1f1f4":[["\uD83C\uDDF3\uD83C\uDDF4"],"","",["flag-no"],3,23,15,0],
		"1f1f3-1f1f5":[["\uD83C\uDDF3\uD83C\uDDF5"],"","",["flag-np"],3,24,15,0],
		"1f1f3-1f1f7":[["\uD83C\uDDF3\uD83C\uDDF7"],"","",["flag-nr"],3,25,15,0],
		"1f1f3-1f1fa":[["\uD83C\uDDF3\uD83C\uDDFA"],"","",["flag-nu"],3,26,15,0],
		"1f1f3-1f1ff":[["\uD83C\uDDF3\uD83C\uDDFF"],"","",["flag-nz"],3,27,15,0],
		"1f1f4-1f1f2":[["\uD83C\uDDF4\uD83C\uDDF2"],"","",["flag-om"],3,28,15,0],
		"1f1f5-1f1e6":[["\uD83C\uDDF5\uD83C\uDDE6"],"","",["flag-pa"],3,29,15,0],
		"1f1f5-1f1ea":[["\uD83C\uDDF5\uD83C\uDDEA"],"","",["flag-pe"],3,30,15,0],
		"1f1f5-1f1eb":[["\uD83C\uDDF5\uD83C\uDDEB"],"","",["flag-pf"],3,31,15,0],
		"1f1f5-1f1ec":[["\uD83C\uDDF5\uD83C\uDDEC"],"","",["flag-pg"],3,32,15,0],
		"1f1f5-1f1ed":[["\uD83C\uDDF5\uD83C\uDDED"],"","",["flag-ph"],3,33,15,0],
		"1f1f5-1f1f0":[["\uD83C\uDDF5\uD83C\uDDF0"],"","",["flag-pk"],3,34,15,0],
		"1f1f5-1f1f1":[["\uD83C\uDDF5\uD83C\uDDF1"],"","",["flag-pl"],3,35,15,0],
		"1f1f5-1f1f2":[["\uD83C\uDDF5\uD83C\uDDF2"],"","",["flag-pm"],3,36,15,0],
		"1f1f5-1f1f3":[["\uD83C\uDDF5\uD83C\uDDF3"],"","",["flag-pn"],3,37,15,0],
		"1f1f5-1f1f7":[["\uD83C\uDDF5\uD83C\uDDF7"],"","",["flag-pr"],3,38,15,0],
		"1f1f5-1f1f8":[["\uD83C\uDDF5\uD83C\uDDF8"],"","",["flag-ps"],3,39,15,0],
		"1f1f5-1f1f9":[["\uD83C\uDDF5\uD83C\uDDF9"],"","",["flag-pt"],3,40,15,0],
		"1f1f5-1f1fc":[["\uD83C\uDDF5\uD83C\uDDFC"],"","",["flag-pw"],3,41,15,0],
		"1f1f5-1f1fe":[["\uD83C\uDDF5\uD83C\uDDFE"],"","",["flag-py"],3,42,15,0],
		"1f1f6-1f1e6":[["\uD83C\uDDF6\uD83C\uDDE6"],"","",["flag-qa"],3,43,15,0],
		"1f1f7-1f1ea":[["\uD83C\uDDF7\uD83C\uDDEA"],"","",["flag-re"],3,44,15,0],
		"1f1f7-1f1f4":[["\uD83C\uDDF7\uD83C\uDDF4"],"","",["flag-ro"],3,45,15,0],
		"1f1f7-1f1f8":[["\uD83C\uDDF7\uD83C\uDDF8"],"","",["flag-rs"],3,46,15,0],
		"1f1f7-1f1fa":[["\uD83C\uDDF7\uD83C\uDDFA"],"\uE512","\uDBB9\uDCEC",["ru","flag-ru"],3,47,15,0],
		"1f1f7-1f1fc":[["\uD83C\uDDF7\uD83C\uDDFC"],"","",["flag-rw"],3,48,15,0],
		"1f1f8-1f1e6":[["\uD83C\uDDF8\uD83C\uDDE6"],"","",["flag-sa"],3,49,15,0],
		"1f1f8-1f1e7":[["\uD83C\uDDF8\uD83C\uDDE7"],"","",["flag-sb"],3,50,15,0],
		"1f1f8-1f1e8":[["\uD83C\uDDF8\uD83C\uDDE8"],"","",["flag-sc"],3,51,15,0],
		"1f1f8-1f1e9":[["\uD83C\uDDF8\uD83C\uDDE9"],"","",["flag-sd"],3,52,15,0],
		"1f1f8-1f1ea":[["\uD83C\uDDF8\uD83C\uDDEA"],"","",["flag-se"],3,53,15,0],
		"1f1f8-1f1ec":[["\uD83C\uDDF8\uD83C\uDDEC"],"","",["flag-sg"],3,54,15,0],
		"1f1f8-1f1ed":[["\uD83C\uDDF8\uD83C\uDDED"],"","",["flag-sh"],3,55,15,0],
		"1f1f8-1f1ee":[["\uD83C\uDDF8\uD83C\uDDEE"],"","",["flag-si"],3,56,15,0],
		"1f1f8-1f1ef":[["\uD83C\uDDF8\uD83C\uDDEF"],"","",["flag-sj"],3,57,15,0],
		"1f1f8-1f1f0":[["\uD83C\uDDF8\uD83C\uDDF0"],"","",["flag-sk"],3,58,15,0],
		"1f1f8-1f1f1":[["\uD83C\uDDF8\uD83C\uDDF1"],"","",["flag-sl"],3,59,15,0],
		"1f1f8-1f1f2":[["\uD83C\uDDF8\uD83C\uDDF2"],"","",["flag-sm"],4,0,15,0],
		"1f1f8-1f1f3":[["\uD83C\uDDF8\uD83C\uDDF3"],"","",["flag-sn"],4,1,15,0],
		"1f1f8-1f1f4":[["\uD83C\uDDF8\uD83C\uDDF4"],"","",["flag-so"],4,2,15,0],
		"1f1f8-1f1f7":[["\uD83C\uDDF8\uD83C\uDDF7"],"","",["flag-sr"],4,3,15,0],
		"1f1f8-1f1f8":[["\uD83C\uDDF8\uD83C\uDDF8"],"","",["flag-ss"],4,4,15,0],
		"1f1f8-1f1f9":[["\uD83C\uDDF8\uD83C\uDDF9"],"","",["flag-st"],4,5,15,0],
		"1f1f8-1f1fb":[["\uD83C\uDDF8\uD83C\uDDFB"],"","",["flag-sv"],4,6,15,0],
		"1f1f8-1f1fd":[["\uD83C\uDDF8\uD83C\uDDFD"],"","",["flag-sx"],4,7,15,0],
		"1f1f8-1f1fe":[["\uD83C\uDDF8\uD83C\uDDFE"],"","",["flag-sy"],4,8,15,0],
		"1f1f8-1f1ff":[["\uD83C\uDDF8\uD83C\uDDFF"],"","",["flag-sz"],4,9,15,0],
		"1f1f9-1f1e6":[["\uD83C\uDDF9\uD83C\uDDE6"],"","",["flag-ta"],4,10,15,0],
		"1f1f9-1f1e8":[["\uD83C\uDDF9\uD83C\uDDE8"],"","",["flag-tc"],4,11,15,0],
		"1f1f9-1f1e9":[["\uD83C\uDDF9\uD83C\uDDE9"],"","",["flag-td"],4,12,15,0],
		"1f1f9-1f1eb":[["\uD83C\uDDF9\uD83C\uDDEB"],"","",["flag-tf"],4,13,15,0],
		"1f1f9-1f1ec":[["\uD83C\uDDF9\uD83C\uDDEC"],"","",["flag-tg"],4,14,15,0],
		"1f1f9-1f1ed":[["\uD83C\uDDF9\uD83C\uDDED"],"","",["flag-th"],4,15,15,0],
		"1f1f9-1f1ef":[["\uD83C\uDDF9\uD83C\uDDEF"],"","",["flag-tj"],4,16,15,0],
		"1f1f9-1f1f0":[["\uD83C\uDDF9\uD83C\uDDF0"],"","",["flag-tk"],4,17,15,0],
		"1f1f9-1f1f1":[["\uD83C\uDDF9\uD83C\uDDF1"],"","",["flag-tl"],4,18,15,0],
		"1f1f9-1f1f2":[["\uD83C\uDDF9\uD83C\uDDF2"],"","",["flag-tm"],4,19,15,0],
		"1f1f9-1f1f3":[["\uD83C\uDDF9\uD83C\uDDF3"],"","",["flag-tn"],4,20,15,0],
		"1f1f9-1f1f4":[["\uD83C\uDDF9\uD83C\uDDF4"],"","",["flag-to"],4,21,15,0],
		"1f1f9-1f1f7":[["\uD83C\uDDF9\uD83C\uDDF7"],"","",["flag-tr"],4,22,15,0],
		"1f1f9-1f1f9":[["\uD83C\uDDF9\uD83C\uDDF9"],"","",["flag-tt"],4,23,15,0],
		"1f1f9-1f1fb":[["\uD83C\uDDF9\uD83C\uDDFB"],"","",["flag-tv"],4,24,15,0],
		"1f1f9-1f1fc":[["\uD83C\uDDF9\uD83C\uDDFC"],"","",["flag-tw"],4,25,15,0],
		"1f1f9-1f1ff":[["\uD83C\uDDF9\uD83C\uDDFF"],"","",["flag-tz"],4,26,15,0],
		"1f1fa-1f1e6":[["\uD83C\uDDFA\uD83C\uDDE6"],"","",["flag-ua"],4,27,15,0],
		"1f1fa-1f1ec":[["\uD83C\uDDFA\uD83C\uDDEC"],"","",["flag-ug"],4,28,15,0],
		"1f1fa-1f1f2":[["\uD83C\uDDFA\uD83C\uDDF2"],"","",["flag-um"],4,29,15,0],
		"1f1fa-1f1f3":[["\uD83C\uDDFA\uD83C\uDDF3"],"","",["flag-un"],4,30,15,0],
		"1f1fa-1f1f8":[["\uD83C\uDDFA\uD83C\uDDF8"],"\uE50C","\uDBB9\uDCE6",["us","flag-us"],4,31,15,0],
		"1f1fa-1f1fe":[["\uD83C\uDDFA\uD83C\uDDFE"],"","",["flag-uy"],4,32,15,0],
		"1f1fa-1f1ff":[["\uD83C\uDDFA\uD83C\uDDFF"],"","",["flag-uz"],4,33,15,0],
		"1f1fb-1f1e6":[["\uD83C\uDDFB\uD83C\uDDE6"],"","",["flag-va"],4,34,15,0],
		"1f1fb-1f1e8":[["\uD83C\uDDFB\uD83C\uDDE8"],"","",["flag-vc"],4,35,15,0],
		"1f1fb-1f1ea":[["\uD83C\uDDFB\uD83C\uDDEA"],"","",["flag-ve"],4,36,15,0],
		"1f1fb-1f1ec":[["\uD83C\uDDFB\uD83C\uDDEC"],"","",["flag-vg"],4,37,15,0],
		"1f1fb-1f1ee":[["\uD83C\uDDFB\uD83C\uDDEE"],"","",["flag-vi"],4,38,15,0],
		"1f1fb-1f1f3":[["\uD83C\uDDFB\uD83C\uDDF3"],"","",["flag-vn"],4,39,15,0],
		"1f1fb-1f1fa":[["\uD83C\uDDFB\uD83C\uDDFA"],"","",["flag-vu"],4,40,15,0],
		"1f1fc-1f1eb":[["\uD83C\uDDFC\uD83C\uDDEB"],"","",["flag-wf"],4,41,15,0],
		"1f1fc-1f1f8":[["\uD83C\uDDFC\uD83C\uDDF8"],"","",["flag-ws"],4,42,15,0],
		"1f1fd-1f1f0":[["\uD83C\uDDFD\uD83C\uDDF0"],"","",["flag-xk"],4,43,15,0],
		"1f1fe-1f1ea":[["\uD83C\uDDFE\uD83C\uDDEA"],"","",["flag-ye"],4,44,15,0],
		"1f1fe-1f1f9":[["\uD83C\uDDFE\uD83C\uDDF9"],"","",["flag-yt"],4,45,15,0],
		"1f1ff-1f1e6":[["\uD83C\uDDFF\uD83C\uDDE6"],"","",["flag-za"],4,46,15,0],
		"1f1ff-1f1f2":[["\uD83C\uDDFF\uD83C\uDDF2"],"","",["flag-zm"],4,47,15,0],
		"1f1ff-1f1fc":[["\uD83C\uDDFF\uD83C\uDDFC"],"","",["flag-zw"],4,48,15,0],
		"1f3f4-e0067-e0062-e0065-e006e-e0067-e007f":[["\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F"],"","",["flag-england"],10,42,15,0],
		"1f3f4-e0067-e0062-e0073-e0063-e0074-e007f":[["\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F"],"","",["flag-scotland"],10,43,15,0],
		"1f3f4-e0067-e0062-e0077-e006c-e0073-e007f":[["\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F"],"","",["flag-wales"],10,44,15,0],
		"1f3f3-fe0f-200d-1f308":[["\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08","\uD83C\uDFF3\u200D\uD83C\uDF08"],"","",["rainbow-flag"],10,38,15,0],
		"1f3f3-fe0f-200d-26a7-fe0f":[["\uD83C\uDFF3\uFE0F\u200D\u26A7\uFE0F"],"","",["transgender_flag"],10,39,7,0],
		"1f3f4-200d-2620-fe0f":[["\uD83C\uDFF4\u200D\u2620\uFE0F","\uD83C\uDFF4\u200D\u2620"],"","",["pirate_flag"],10,41,15,0]
    };

    /** @private */
    /** @private *//*
    emoji.emoticons_data = {
        "<3": "heart",
        ":o)": "monkey_face",
        ":*": "kiss",
        ":-*": "kiss",
        "<\/3": "broken_heart",
        "=)": "smiley",
        "=-)": "smiley",
        "C:": "smile",
        "c:": "smile",
        ":D": "smile",
        ":-D": "smile",
        ":>": "laughing",
        ":->": "laughing",
        ";)": "wink",
        ";-)": "wink",
        ":)": "blush",
        "(:": "blush",
        ":-)": "blush",
        "8)": "sunglasses",
        ":|": "neutral_face",
        ":-|": "neutral_face",
        ":\\": "confused",
        ":-\\": "confused",
        ":\/": "confused",
        ":-\/": "confused",
        ":p": "stuck_out_tongue",
        ":-p": "stuck_out_tongue",
        ":P": "stuck_out_tongue",
        ":-P": "stuck_out_tongue",
        ":b": "stuck_out_tongue",
        ":-b": "stuck_out_tongue",
        ";p": "stuck_out_tongue_winking_eye",
        ";-p": "stuck_out_tongue_winking_eye",
        ";b": "stuck_out_tongue_winking_eye",
        ";-b": "stuck_out_tongue_winking_eye",
        ";P": "stuck_out_tongue_winking_eye",
        ";-P": "stuck_out_tongue_winking_eye",
        "):": "disappointed",
        ":(": "disappointed",
        ":-(": "disappointed",
        ">:(": "angry",
        ">:-(": "angry",
        ":'(": "cry",
        "D:": "anguished",
        ":o": "open_mouth",
        ":-o": "open_mouth"
    };*/
    /** @private *//*
    emoji.variations_data = {
        "261d-1f3fb": [1, 4, 13],
        "261d-1f3fc": [1, 5, 13],
        "261d-1f3fd": [1, 6, 13],
        "261d-1f3fe": [1, 7, 13],
        "261d-1f3ff": [1, 8, 13],
        "26f9-1f3fb": [2, 25, 13],
        "26f9-1f3fc": [2, 26, 13],
        "26f9-1f3fd": [2, 27, 13],
        "26f9-1f3fe": [2, 28, 13],
        "26f9-1f3ff": [2, 29, 13],
        "270a-1f3fb": [2, 37, 13],
        "270a-1f3fc": [2, 38, 13],
        "270a-1f3fd": [2, 39, 13],
        "270a-1f3fe": [2, 40, 13],
        "270a-1f3ff": [2, 41, 13],
        "270b-1f3fb": [2, 43, 13],
        "270b-1f3fc": [2, 44, 13],
        "270b-1f3fd": [2, 45, 13],
        "270b-1f3fe": [2, 46, 13],
        "270b-1f3ff": [2, 47, 13],
        "270c-1f3fb": [3, 1, 13],
        "270c-1f3fc": [3, 2, 13],
        "270c-1f3fd": [3, 3, 13],
        "270c-1f3fe": [3, 4, 13],
        "270c-1f3ff": [3, 5, 13],
        "270d-1f3fb": [3, 7, 13],
        "270d-1f3fc": [3, 8, 13],
        "270d-1f3fd": [3, 9, 13],
        "270d-1f3fe": [3, 10, 13],
        "270d-1f3ff": [3, 11, 13],
        "1f385-1f3fb": [7, 22, 13],
        "1f385-1f3fc": [7, 23, 13],
        "1f385-1f3fd": [7, 24, 13],
        "1f385-1f3fe": [7, 25, 13],
        "1f385-1f3ff": [7, 26, 13],
        "1f3c3-1f3fb": [8, 36, 13],
        "1f3c3-1f3fc": [8, 37, 13],
        "1f3c3-1f3fd": [8, 38, 13],
        "1f3c3-1f3fe": [8, 39, 13],
        "1f3c3-1f3ff": [8, 40, 13],
        "1f3c4-1f3fb": [8, 42, 13],
        "1f3c4-1f3fc": [8, 43, 13],
        "1f3c4-1f3fd": [8, 44, 13],
        "1f3c4-1f3fe": [8, 45, 13],
        "1f3c4-1f3ff": [8, 46, 13],
        "1f3ca-1f3fb": [9, 5, 13],
        "1f3ca-1f3fc": [9, 6, 13],
        "1f3ca-1f3fd": [9, 7, 13],
        "1f3ca-1f3fe": [9, 8, 13],
        "1f3ca-1f3ff": [9, 9, 13],
        "1f3cb-1f3fb": [9, 11, 13],
        "1f3cb-1f3fc": [9, 12, 13],
        "1f3cb-1f3fd": [9, 13, 13],
        "1f3cb-1f3fe": [9, 14, 13],
        "1f3cb-1f3ff": [9, 15, 13],
        "1f442-1f3fb": [11, 36, 13],
        "1f442-1f3fc": [11, 37, 13],
        "1f442-1f3fd": [11, 38, 13],
        "1f442-1f3fe": [11, 39, 13],
        "1f442-1f3ff": [11, 40, 13],
        "1f443-1f3fb": [11, 42, 13],
        "1f443-1f3fc": [11, 43, 13],
        "1f443-1f3fd": [11, 44, 13],
        "1f443-1f3fe": [11, 45, 13],
        "1f443-1f3ff": [11, 46, 13],
        "1f446-1f3fb": [12, 2, 13],
        "1f446-1f3fc": [12, 3, 13],
        "1f446-1f3fd": [12, 4, 13],
        "1f446-1f3fe": [12, 5, 13],
        "1f446-1f3ff": [12, 6, 13],
        "1f447-1f3fb": [12, 8, 13],
        "1f447-1f3fc": [12, 9, 13],
        "1f447-1f3fd": [12, 10, 13],
        "1f447-1f3fe": [12, 11, 13],
        "1f447-1f3ff": [12, 12, 13],
        "1f448-1f3fb": [12, 14, 13],
        "1f448-1f3fc": [12, 15, 13],
        "1f448-1f3fd": [12, 16, 13],
        "1f448-1f3fe": [12, 17, 13],
        "1f448-1f3ff": [12, 18, 13],
        "1f449-1f3fb": [12, 20, 13],
        "1f449-1f3fc": [12, 21, 13],
        "1f449-1f3fd": [12, 22, 13],
        "1f449-1f3fe": [12, 23, 13],
        "1f449-1f3ff": [12, 24, 13],
        "1f44a-1f3fb": [12, 26, 13],
        "1f44a-1f3fc": [12, 27, 13],
        "1f44a-1f3fd": [12, 28, 13],
        "1f44a-1f3fe": [12, 29, 13],
        "1f44a-1f3ff": [12, 30, 13],
        "1f44b-1f3fb": [12, 32, 13],
        "1f44b-1f3fc": [12, 33, 13],
        "1f44b-1f3fd": [12, 34, 13],
        "1f44b-1f3fe": [12, 35, 13],
        "1f44b-1f3ff": [12, 36, 13],
        "1f44c-1f3fb": [12, 38, 13],
        "1f44c-1f3fc": [12, 39, 13],
        "1f44c-1f3fd": [12, 40, 13],
        "1f44c-1f3fe": [12, 41, 13],
        "1f44c-1f3ff": [12, 42, 13],
        "1f44d-1f3fb": [12, 44, 13],
        "1f44d-1f3fc": [12, 45, 13],
        "1f44d-1f3fd": [12, 46, 13],
        "1f44d-1f3fe": [12, 47, 13],
        "1f44d-1f3ff": [13, 0, 13],
        "1f44e-1f3fb": [13, 2, 13],
        "1f44e-1f3fc": [13, 3, 13],
        "1f44e-1f3fd": [13, 4, 13],
        "1f44e-1f3fe": [13, 5, 13],
        "1f44e-1f3ff": [13, 6, 13],
        "1f44f-1f3fb": [13, 8, 13],
        "1f44f-1f3fc": [13, 9, 13],
        "1f44f-1f3fd": [13, 10, 13],
        "1f44f-1f3fe": [13, 11, 13],
        "1f44f-1f3ff": [13, 12, 13],
        "1f450-1f3fb": [13, 14, 13],
        "1f450-1f3fc": [13, 15, 13],
        "1f450-1f3fd": [13, 16, 13],
        "1f450-1f3fe": [13, 17, 13],
        "1f450-1f3ff": [13, 18, 13],
        "1f466-1f3fb": [13, 41, 13],
        "1f466-1f3fc": [13, 42, 13],
        "1f466-1f3fd": [13, 43, 13],
        "1f466-1f3fe": [13, 44, 13],
        "1f466-1f3ff": [13, 45, 13],
        "1f467-1f3fb": [13, 47, 13],
        "1f467-1f3fc": [14, 0, 13],
        "1f467-1f3fd": [14, 1, 13],
        "1f467-1f3fe": [14, 2, 13],
        "1f467-1f3ff": [14, 3, 13],
        "1f468-1f3fb": [14, 5, 13],
        "1f468-1f3fc": [14, 6, 13],
        "1f468-1f3fd": [14, 7, 13],
        "1f468-1f3fe": [14, 8, 13],
        "1f468-1f3ff": [14, 9, 13],
        "1f469-1f3fb": [14, 11, 13],
        "1f469-1f3fc": [14, 12, 13],
        "1f469-1f3fd": [14, 13, 13],
        "1f469-1f3fe": [14, 14, 13],
        "1f469-1f3ff": [14, 15, 13],
        "1f46e-1f3fb": [14, 21, 13],
        "1f46e-1f3fc": [14, 22, 13],
        "1f46e-1f3fd": [14, 23, 13],
        "1f46e-1f3fe": [14, 24, 13],
        "1f46e-1f3ff": [14, 25, 13],
        "1f470-1f3fb": [14, 28, 13],
        "1f470-1f3fc": [14, 29, 13],
        "1f470-1f3fd": [14, 30, 13],
        "1f470-1f3fe": [14, 31, 13],
        "1f470-1f3ff": [14, 32, 13],
        "1f471-1f3fb": [14, 34, 13],
        "1f471-1f3fc": [14, 35, 13],
        "1f471-1f3fd": [14, 36, 13],
        "1f471-1f3fe": [14, 37, 13],
        "1f471-1f3ff": [14, 38, 13],
        "1f472-1f3fb": [14, 40, 13],
        "1f472-1f3fc": [14, 41, 13],
        "1f472-1f3fd": [14, 42, 13],
        "1f472-1f3fe": [14, 43, 13],
        "1f472-1f3ff": [14, 44, 13],
        "1f473-1f3fb": [14, 46, 13],
        "1f473-1f3fc": [14, 47, 13],
        "1f473-1f3fd": [15, 0, 13],
        "1f473-1f3fe": [15, 1, 13],
        "1f473-1f3ff": [15, 2, 13],
        "1f474-1f3fb": [15, 4, 13],
        "1f474-1f3fc": [15, 5, 13],
        "1f474-1f3fd": [15, 6, 13],
        "1f474-1f3fe": [15, 7, 13],
        "1f474-1f3ff": [15, 8, 13],
        "1f475-1f3fb": [15, 10, 13],
        "1f475-1f3fc": [15, 11, 13],
        "1f475-1f3fd": [15, 12, 13],
        "1f475-1f3fe": [15, 13, 13],
        "1f475-1f3ff": [15, 14, 13],
        "1f476-1f3fb": [15, 16, 13],
        "1f476-1f3fc": [15, 17, 13],
        "1f476-1f3fd": [15, 18, 13],
        "1f476-1f3fe": [15, 19, 13],
        "1f476-1f3ff": [15, 20, 13],
        "1f477-1f3fb": [15, 22, 13],
        "1f477-1f3fc": [15, 23, 13],
        "1f477-1f3fd": [15, 24, 13],
        "1f477-1f3fe": [15, 25, 13],
        "1f477-1f3ff": [15, 26, 13],
        "1f478-1f3fb": [15, 28, 13],
        "1f478-1f3fc": [15, 29, 13],
        "1f478-1f3fd": [15, 30, 13],
        "1f478-1f3fe": [15, 31, 13],
        "1f478-1f3ff": [15, 32, 13],
        "1f47c-1f3fb": [15, 37, 13],
        "1f47c-1f3fc": [15, 38, 13],
        "1f47c-1f3fd": [15, 39, 13],
        "1f47c-1f3fe": [15, 40, 13],
        "1f47c-1f3ff": [15, 41, 13],
        "1f481-1f3fb": [15, 47, 13],
        "1f481-1f3fc": [16, 0, 13],
        "1f481-1f3fd": [16, 1, 13],
        "1f481-1f3fe": [16, 2, 13],
        "1f481-1f3ff": [16, 3, 13],
        "1f482-1f3fb": [16, 5, 13],
        "1f482-1f3fc": [16, 6, 13],
        "1f482-1f3fd": [16, 7, 13],
        "1f482-1f3fe": [16, 8, 13],
        "1f482-1f3ff": [16, 9, 13],
        "1f483-1f3fb": [16, 11, 13],
        "1f483-1f3fc": [16, 12, 13],
        "1f483-1f3fd": [16, 13, 13],
        "1f483-1f3fe": [16, 14, 13],
        "1f483-1f3ff": [16, 15, 13],
        "1f485-1f3fb": [16, 18, 13],
        "1f485-1f3fc": [16, 19, 13],
        "1f485-1f3fd": [16, 20, 13],
        "1f485-1f3fe": [16, 21, 13],
        "1f485-1f3ff": [16, 22, 13],
        "1f486-1f3fb": [16, 24, 13],
        "1f486-1f3fc": [16, 25, 13],
        "1f486-1f3fd": [16, 26, 13],
        "1f486-1f3fe": [16, 27, 13],
        "1f486-1f3ff": [16, 28, 13],
        "1f487-1f3fb": [16, 30, 13],
        "1f487-1f3fc": [16, 31, 13],
        "1f487-1f3fd": [16, 32, 13],
        "1f487-1f3fe": [16, 33, 13],
        "1f487-1f3ff": [16, 34, 13],
        "1f4aa-1f3fb": [17, 22, 13],
        "1f4aa-1f3fc": [17, 23, 13],
        "1f4aa-1f3fd": [17, 24, 13],
        "1f4aa-1f3fe": [17, 25, 13],
        "1f4aa-1f3ff": [17, 26, 13],
        "1f575-1f3fb": [21, 16, 13],
        "1f575-1f3fc": [21, 17, 13],
        "1f575-1f3fd": [21, 18, 13],
        "1f575-1f3fe": [21, 19, 13],
        "1f575-1f3ff": [21, 20, 13],
        "1f57a-1f3fb": [21, 26, 12],
        "1f57a-1f3fc": [21, 27, 12],
        "1f57a-1f3fd": [21, 28, 12],
        "1f57a-1f3fe": [21, 29, 12],
        "1f57a-1f3ff": [21, 30, 12],
        "1f590-1f3fb": [21, 37, 13],
        "1f590-1f3fc": [21, 38, 13],
        "1f590-1f3fd": [21, 39, 13],
        "1f590-1f3fe": [21, 40, 13],
        "1f590-1f3ff": [21, 41, 13],
        "1f595-1f3fb": [21, 43, 13],
        "1f595-1f3fc": [21, 44, 13],
        "1f595-1f3fd": [21, 45, 13],
        "1f595-1f3fe": [21, 46, 13],
        "1f595-1f3ff": [21, 47, 13],
        "1f596-1f3fb": [22, 1, 13],
        "1f596-1f3fc": [22, 2, 13],
        "1f596-1f3fd": [22, 3, 13],
        "1f596-1f3fe": [22, 4, 13],
        "1f596-1f3ff": [22, 5, 13],
        "1f645-1f3fb": [24, 6, 13],
        "1f645-1f3fc": [24, 7, 13],
        "1f645-1f3fd": [24, 8, 13],
        "1f645-1f3fe": [24, 9, 13],
        "1f645-1f3ff": [24, 10, 13],
        "1f646-1f3fb": [24, 12, 13],
        "1f646-1f3fc": [24, 13, 13],
        "1f646-1f3fd": [24, 14, 13],
        "1f646-1f3fe": [24, 15, 13],
        "1f646-1f3ff": [24, 16, 13],
        "1f647-1f3fb": [24, 18, 13],
        "1f647-1f3fc": [24, 19, 13],
        "1f647-1f3fd": [24, 20, 13],
        "1f647-1f3fe": [24, 21, 13],
        "1f647-1f3ff": [24, 22, 13],
        "1f64b-1f3fb": [24, 27, 13],
        "1f64b-1f3fc": [24, 28, 13],
        "1f64b-1f3fd": [24, 29, 13],
        "1f64b-1f3fe": [24, 30, 13],
        "1f64b-1f3ff": [24, 31, 13],
        "1f64c-1f3fb": [24, 33, 13],
        "1f64c-1f3fc": [24, 34, 13],
        "1f64c-1f3fd": [24, 35, 13],
        "1f64c-1f3fe": [24, 36, 13],
        "1f64c-1f3ff": [24, 37, 13],
        "1f64d-1f3fb": [24, 39, 13],
        "1f64d-1f3fc": [24, 40, 13],
        "1f64d-1f3fd": [24, 41, 13],
        "1f64d-1f3fe": [24, 42, 13],
        "1f64d-1f3ff": [24, 43, 13],
        "1f64e-1f3fb": [24, 45, 13],
        "1f64e-1f3fc": [24, 46, 13],
        "1f64e-1f3fd": [24, 47, 13],
        "1f64e-1f3fe": [25, 0, 13],
        "1f64e-1f3ff": [25, 1, 13],
        "1f64f-1f3fb": [25, 3, 13],
        "1f64f-1f3fc": [25, 4, 13],
        "1f64f-1f3fd": [25, 5, 13],
        "1f64f-1f3fe": [25, 6, 13],
        "1f64f-1f3ff": [25, 7, 13],
        "1f6a3-1f3fb": [25, 44, 13],
        "1f6a3-1f3fc": [25, 45, 13],
        "1f6a3-1f3fd": [25, 46, 13],
        "1f6a3-1f3fe": [25, 47, 13],
        "1f6a3-1f3ff": [26, 0, 13],
        "1f6b4-1f3fb": [26, 18, 13],
        "1f6b4-1f3fc": [26, 19, 13],
        "1f6b4-1f3fd": [26, 20, 13],
        "1f6b4-1f3fe": [26, 21, 13],
        "1f6b4-1f3ff": [26, 22, 13],
        "1f6b5-1f3fb": [26, 24, 13],
        "1f6b5-1f3fc": [26, 25, 13],
        "1f6b5-1f3fd": [26, 26, 13],
        "1f6b5-1f3fe": [26, 27, 13],
        "1f6b5-1f3ff": [26, 28, 13],
        "1f6b6-1f3fb": [26, 30, 13],
        "1f6b6-1f3fc": [26, 31, 13],
        "1f6b6-1f3fd": [26, 32, 13],
        "1f6b6-1f3fe": [26, 33, 13],
        "1f6b6-1f3ff": [26, 34, 13],
        "1f6c0-1f3fb": [26, 45, 13],
        "1f6c0-1f3fc": [26, 46, 13],
        "1f6c0-1f3fd": [26, 47, 13],
        "1f6c0-1f3fe": [27, 0, 13],
        "1f6c0-1f3ff": [27, 1, 13],
        "1f918-1f3fb": [27, 38, 13],
        "1f918-1f3fc": [27, 39, 13],
        "1f918-1f3fd": [27, 40, 13],
        "1f918-1f3fe": [27, 41, 13],
        "1f918-1f3ff": [27, 42, 13],
        "1f919-1f3fb": [27, 44, 12],
        "1f919-1f3fc": [27, 45, 12],
        "1f919-1f3fd": [27, 46, 12],
        "1f919-1f3fe": [27, 47, 12],
        "1f919-1f3ff": [28, 0, 12],
        "1f91a-1f3fb": [28, 2, 12],
        "1f91a-1f3fc": [28, 3, 12],
        "1f91a-1f3fd": [28, 4, 12],
        "1f91a-1f3fe": [28, 5, 12],
        "1f91a-1f3ff": [28, 6, 12],
        "1f91b-1f3fb": [28, 8, 12],
        "1f91b-1f3fc": [28, 9, 12],
        "1f91b-1f3fd": [28, 10, 12],
        "1f91b-1f3fe": [28, 11, 12],
        "1f91b-1f3ff": [28, 12, 12],
        "1f91c-1f3fb": [28, 14, 12],
        "1f91c-1f3fc": [28, 15, 12],
        "1f91c-1f3fd": [28, 16, 12],
        "1f91c-1f3fe": [28, 17, 12],
        "1f91c-1f3ff": [28, 18, 12],
        "1f91d-1f3fb": [28, 20, 12],
        "1f91d-1f3fc": [28, 21, 12],
        "1f91d-1f3fd": [28, 22, 12],
        "1f91d-1f3fe": [28, 23, 12],
        "1f91d-1f3ff": [28, 24, 12],
        "1f91e-1f3fb": [28, 26, 12],
        "1f91e-1f3fc": [28, 27, 12],
        "1f91e-1f3fd": [28, 28, 12],
        "1f91e-1f3fe": [28, 29, 12],
        "1f91e-1f3ff": [28, 30, 12],
        "1f926-1f3fb": [28, 38, 12],
        "1f926-1f3fc": [28, 39, 12],
        "1f926-1f3fd": [28, 40, 12],
        "1f926-1f3fe": [28, 41, 12],
        "1f926-1f3ff": [28, 42, 12],
        "1f930-1f3fb": [28, 45, 12],
        "1f930-1f3fc": [28, 46, 12],
        "1f930-1f3fd": [28, 47, 12],
        "1f930-1f3fe": [29, 0, 12],
        "1f930-1f3ff": [29, 1, 12],
        "1f933-1f3fb": [29, 3, 12],
        "1f933-1f3fc": [29, 4, 12],
        "1f933-1f3fd": [29, 5, 12],
        "1f933-1f3fe": [29, 6, 12],
        "1f933-1f3ff": [29, 7, 12],
        "1f934-1f3fb": [29, 9, 12],
        "1f934-1f3fc": [29, 10, 12],
        "1f934-1f3fd": [29, 11, 12],
        "1f934-1f3fe": [29, 12, 12],
        "1f934-1f3ff": [29, 13, 12],
        "1f935-1f3fb": [29, 15, 12],
        "1f935-1f3fc": [29, 16, 12],
        "1f935-1f3fd": [29, 17, 12],
        "1f935-1f3fe": [29, 18, 12],
        "1f935-1f3ff": [29, 19, 12],
        "1f936-1f3fb": [29, 21, 12],
        "1f936-1f3fc": [29, 22, 12],
        "1f936-1f3fd": [29, 23, 12],
        "1f936-1f3fe": [29, 24, 12],
        "1f936-1f3ff": [29, 25, 12],
        "1f937-1f3fb": [29, 27, 12],
        "1f937-1f3fc": [29, 28, 12],
        "1f937-1f3fd": [29, 29, 12],
        "1f937-1f3fe": [29, 30, 12],
        "1f937-1f3ff": [29, 31, 12],
        "1f938-1f3fb": [29, 33, 12],
        "1f938-1f3fc": [29, 34, 12],
        "1f938-1f3fd": [29, 35, 12],
        "1f938-1f3fe": [29, 36, 12],
        "1f938-1f3ff": [29, 37, 12],
        "1f939-1f3fb": [29, 39, 12],
        "1f939-1f3fc": [29, 40, 12],
        "1f939-1f3fd": [29, 41, 12],
        "1f939-1f3fe": [29, 42, 12],
        "1f939-1f3ff": [29, 43, 12],
        "1f93c-1f3fb": [29, 46, 12],
        "1f93c-1f3fc": [29, 47, 12],
        "1f93c-1f3fd": [30, 0, 12],
        "1f93c-1f3fe": [30, 1, 12],
        "1f93c-1f3ff": [30, 2, 12],
        "1f93d-1f3fb": [30, 4, 12],
        "1f93d-1f3fc": [30, 5, 12],
        "1f93d-1f3fd": [30, 6, 12],
        "1f93d-1f3fe": [30, 7, 12],
        "1f93d-1f3ff": [30, 8, 12],
        "1f93e-1f3fb": [30, 10, 12],
        "1f93e-1f3fc": [30, 11, 12],
        "1f93e-1f3fd": [30, 12, 12],
        "1f93e-1f3fe": [30, 13, 12],
        "1f93e-1f3ff": [30, 14, 12]
    };*/

    if (typeof exports === 'object') {
        module.exports = emoji;
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return emoji;
        });
    } else {
        this.emoji = emoji;
    }

    if (local_setup) local_setup(emoji);
}).call(function () {
    return this || (typeof window !== 'undefined' ? window : global);
}(), function (emoji) {

    // Set up emoji for your environment here!
    // For instance, you might want to always
    // render emoji as HTML, and include the
    // name as the title of the HTML elements:

    /*
     emoji.include_title = true;
     emoji.allow_native = false;
     */

    // And you might want to always use
    // Google's emoji images:

    /*
     emoji.img_set = 'google';
     */

    // And you might want want to point to
    // a CDN for your sheets and img files

    /*
     emoji.img_sets['google']['path'] = 'http://cdn.example.com/emoji/';
     emoji.img_sets['google']['sheet'] = 'http://cdn.example.com/emoji/sheet_google_64.png';
     */

});
