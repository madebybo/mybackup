/* v3.1 */

nRelate.acs({
	rsearch: {
		fkw: function(p) {
			var keywords = this.dfkw(p),
				meta_conf = {
					'tags': keywords[0]
				};

			this.debug("meta_conf %o", meta_conf);
			this.create_apip('tags');
			this.extend(this.options.plugins[p], meta_conf);

			return keywords;
		}
	},
	related: {
		fph: function(p) {
			var self = this,
				phs = this.dfph(p),
				random_prob = Math.floor(Math.random() * 100),
				desktop_widget_id = (random_prob >= 95) ? 815 : 1273;

			for (var i = 0; i < phs.length; i++) {
				// initiate thumbnail widget
				if (phs[i].getAttribute("data-options").indexOf("815") > -1) {
					phs[i].setAttribute("data-options", "");
					phs[i].setAttribute("data-options", "{widget_id:" + desktop_widget_id + "}");
				}
			};

			return phs;
		}
	}
});