/*
 * v 4.6.2
 * last udpate: 11/04/2014
 */

(function($) {
	window.nr_aq = {
		
		/*
		* Init Application
		*/
		init : function( options ){

			if ( !options.domainid ) {
				$.error("Need a domainid");
				return false;
			}

			// merging _defaults, _settings, and the passed option parameter all to this.option
			$.extend( this.options, this._defaults, options, this._settings );

			// complete API URLs
			var i, url_vars = ['load_api_url','rpm_api_url','save_api_url','advertiser_url','toggle_block_url'];
			for ( i in url_vars ) {
				if (url_vars.hasOwnProperty(i)) 
					this.options[ url_vars[i] ] = this.options.host + this.options[ url_vars[ i ] ] + ( this.options.instance == 'tx' ? '?tx=1' : '' );
			}

			// Detect browser
			var userAgent = navigator.userAgent.toLowerCase();
			this.options.browser = {
				version: (userAgent.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/) || [])[1],
				safari: /webkit/.test(userAgent),
				opera: /opera/.test(userAgent),
				msie: (/msie/.test(userAgent)) && (!/opera/.test(userAgent)),
				mozilla: (/mozilla/.test(userAgent)) && (!/(compatible|webkit)/.test(userAgent))
			};

			if ( this.options.instance == 'aq' ) {
				// store original settings passed by PHP
				this.options.iab_tags_blacklist = options.tag.iab_category.blacklist;
				this.options.cnt_tags_blacklist = options.tag.content_type.blacklist;
			}

			this.originalSettings.org_min_value 	= this.options.minValue;
			this.originalSettings.org_max_value 	= this.options.maxValue;
			this.originalSettings.org_cnt_blklist 	= this.options.cnt_tags_blacklist;
			this.originalSettings.org_iab_blklist 	= this.options.iab_tags_blacklist;

			if ( this.options.instance == 'aq' ) {
				// Populate all tags
				this.populateTags();
			}

			// Initialize UI elements
			this.ui.units_display       = $("#units_display");
			this.ui.current_rpm         = $("#current_rpm .metric_number");
			this.ui.projected_rpm       = $("#projected_rpm .metric_number");
			this.ui.rpm_difference      = $("#arrow_indicator");
			this.ui.slider_text         = $("#amount");
			this.ui.slider_panel        = $("#slider_panel");
			this.ui.results_num         = $("#results_num");
			this.ui.no_units            = $("#no_units_to_show");
			this.ui.tags_text           = $("#tags_selected");
			this.ui.tags_panel          = $("#tags_panel_id");
			this.ui.iab_tags_filters    = $("#iab_tags .aq_tags_option");
			this.ui.cnt_tags_filters    = $("#content_types .aq_tags_option");
			this.ui.units_loading       = $("#units_loading");
			this.ui.s_units_loading     = $("#search_units_loading");
			this.ui.progress_bar        = $("#progress_bar");
			this.ui.progress_text       = $("#progress_text");
			this.ui.paginator_container = $("#paginator_container");
			this.ui.paginator           = $(".paginator");
			this.ui.close_preview       = $('#close_preview');
			this.ui.save_settings       = $('#settings_save');

			// subscribe to custom event
			$(this).on("filter_changed", this.insertUnits );

			this.setupPagination();
			if ( this.options.instance == 'aq' ) {
				this.setupTagsFilter();
				this.setupSlider();
			} else if ( this.options.instance == 'tx' ) {
				if ( !this.inPreview ) {
					this.loadData();
				}
			}
			this.enableBlock();
			this.switchTabs();
			this.saveSettings();
			this.enableSearch();
			this.positionSwitch();
			if ( this.options.instance == 'aq' ) {
				this.loadAdvertisers();
			} else if ( this.options.instance == 'tx' ) {
				this.loadTxPartners();
			}
			this.enableSort();
			this.showBlocked();
			this.closePreview();
			this.refreshCall();
			this.calcCache();

			this.initialized = true;

			// Hide the RPM change indicator first
			this.ui.rpm_difference.css('visibility', 'hidden');
			$('#projected_rpm').css('visibility', 'hidden');
			// this.ui.results_num.hide();

			// take AQ header out of container
			$(".aq-header-wrapper").insertAfter($('.sticky-nav-wrapper'));

			// Warn the user if leaving and there are unsaved changes
			var self = this;
			$(window).on("beforeunload", function(){
				if ( self._dirty === true ) {
					return "Your changes will be lost";
				}
			});
		},



		/**
		* Make API::load() call
		*/
		loadData : function() {
			var self = this;

			self.options.pageMax = 9999;
			self.ui.units_loading.show();
			self.ui.no_units.hide();

			// abort all previous requests before making a new one
			self.abortAll();
			
			$.ajax({
				beforeSend: function( jqXHR ) {
					if ( this.initialized )
						this.xhrPool.push( jqXHR );
					self.ui.results_num.text( 'Calculating ... ' );
				},
				url  	: this.options.load_api_url,
				data 	: {
					domainid : this.options.domainid,
					numUnits : this.options.numUnits,
					offset	 : ( this.options.pageCount - 1 ) * this.options.numUnits,
					lowMat	 : this.options.minValue,
					highMat  : this.options.maxValue,
					blAdvs	 : this.options.advertiser_blklist,
					blCTypes : this.options.cnt_tags_blacklist,
					blIabTags: this.options.iab_tags_blacklist,
					mat 	 : this.options.is_asc ? 'asc' : 'desc',		// descending order by default
					blonly	 : this.options.is_blocked ? '1' : '0'			// non blocked units by default
				},
				dataType: "json",
				success	: function( data ) {
					// clear unit lists before updating this list
					// self._units.blacklist.length = 0;
					self._units.current.length = 0;
					self.ui.units_display.find('.aq_unit').remove();
					self.ui.paginator_container.show();

					// if it's a bad call
					if ( data === null){
						self.ui.no_units.show().html(
							'<h1>Something is not right, please try again.</h1>' +
							'<a class="refresh btn btn-primary">try again</>'
						);
						self.ui.units_loading.hide();
						self.ui.results_num.text( '' );
						return false;
					}

					// if there are no units available
					if ( data.total_count === null){
						self.ui.no_units.show().html(
							'<h1>Your account is not currently set up for ads.</h1>' +
							'<h2>Please contact us at <a href="mailto:support@nrelate.com">support@nrelate.com</a></h2>'
						);
						self.ui.units_loading.hide();
						self.ui.results_num.text( '' );
						self.ui.paginator_container.hide();
						return false;
					}

					// if there are no units to load anymore
					if ( data.units === null || data.units === undefined || data.units.length === 0 ) {
						// no units in the first page, which means no units for the filter
						if (self.options.pageCount === 1){
							self.ui.paginator_container.hide();
						}
						// no units in the subsequent pages, which means reaching the end of pagination
						else {
							self.options.pageMax = self.options.pageCount;
							self.ui.paginator.filter('#prev').removeClass('inactive');
							self.ui.paginator.filter('#next').addClass('inactive');
						}
							
						self.ui.no_units.show().html('<h1>Sorry, there are no units to show now</h1>');
						self.ui.units_loading.hide();
						self.ui.results_num.text( '' );

						return false;
					}

					// show paginator for non-blocked mode
					if (self.options.is_blocked) self.ui.paginator_container.hide();

					for( var i=0, j=data.units.length; i < j; i++ ) {
						data.units[i]._index = i;
						data.units[i].iab_category_list = function( data ) { return self._iab_category_list( data ); };
						data.units[i].content_type_list = function( data ) { return self._content_type_list( data ); };
						data.units[i]._selector = self.tmpl( self._tmpl.unit_selector, data.units[i] );

						self._units.current[i] = data.units[i];
						self._units.current[i].img_maturity_level = self.getMapIndex(self._units.current[i].img_maturity_level)+1;
						self._units.current[i].revenue = self.formatRevenue(self._units.current[i].revenue);
						self._units.op_index_map[data.units[i].OPEDID] = data.units[i]._index;		// keep the OPEDID to index map
					}

					// Update the global counts
					self._units.total_count = data.total_count;
					self._units.total_bl_count = data.total_bl_count;
					self.ui.results_num.html( (self.options.is_blocked ? 'showing ' : 'about <span>') +  (self.options.is_blocked ? data.total_bl_count : data.total_count) + '</span> results');

					// get max page number and apply paginator status
					// self.options.pageMax = (data.total_count % self.options.numUnits === 0) ? ( parseInt(data.total_count / self.options.numUnits) ) : ( (parseInt(data.total_count / self.options.numUnits)) + 1 );
					self.ui.paginator.removeClass('inactive');
					if ( (self.options.pageCount - 1) === 0 ) self.ui.paginator.filter('#prev').addClass('inactive');
					if ( (self.options.pageCount + 1) > self.options.pageMax ) self.ui.paginator.filter('#next').addClass('inactive');

					// initial status for progress bar
					self.ui.progress_bar.progressbar({ value: parseInt( (self.options.pageCount - 1) *100/self.options.pageMax ) });
					self.ui.progress_text.text('Your Progress: ' + parseInt( (self.options.pageCount - 1) *100/self.options.pageMax ) + '%');

					// Update the UI
					$(self).trigger("filter_changed");
				},
				error	: function( jqXHR ){
					//If either of these are true, then it's not a true error and we don't care
				    if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

					console.log( "LOADING REQUEST COMM ERROR" );
				}
			});
		},



		/**
		* set up pagination for units display
		*/
		setupPagination : function(){
			var self = this;

			self.ui.paginator.on('click', function(){
				var paginator = $(this),
					pageCount = self.inPreview ? self.options.pageCountPreview : self.options.pageCount,
					pageMax   = self.inPreview ? self.options.pageMaxPreview : self.options.pageMax;
					
				// go to previous page if direction is negative, otherwise go to next page
				var load = function( direction ) {
					if (self.inPreview)
						self.options.pageCountPreview += direction;
					else
						self.options.pageCount += direction;

					return self.inPreview ? self.previewUnits() : self.loadData();
				}

				if( paginator.attr("id") === 'prev') {
					// don't perform search for prev button when it's on the first page
					if ( (pageCount - 1) === 0 ) return;

					load( -1 );
				}

				if( paginator.attr("id") === 'next') {
					// don't perform search for next button when it's on the last page
					if ( (pageCount + 1) > pageMax ) return;

					load( 1 );
				}
			});
		},



		/**
		* Populate both content type filter and IAB tags filter
		*/
		populateTags : function() {
			var all_cnt_type = this.options.tag.content_type.all,
				all_iab_tags = this.options.tag.iab_category.all,
				i, len;

			$('#types_setting').find('.blocked-count').text( this.options.tag.content_type.blacklist.length + ' blocked');
			$('#type_report').text( ( all_cnt_type.length - this.options.tag.content_type.blacklist.length ) + ' selected');
			$('#categories_setting').find('.blocked-count').text( this.options.tag.iab_category.blacklist.length + ' blocked');
			$('#category_report').text( ( all_iab_tags.length - this.options.tag.iab_category.blacklist.length ) + ' selected');

			if ( this.options.tag.iab_category.blacklist.length === 0 ) $('#select-all').hide();

			for ( i = 0, len = all_cnt_type.length ; i< len ; i++ ){
				$('#content_types').append(
					'<label class="aq_tags_option"><span class="glyphicon"></span>' + all_cnt_type[i] + '</label>'
				);
			}

			for ( i = 0, len = all_iab_tags.length ; i< len ; i++ ){
				$('#iab_tags').append(
					'<label class="aq_tags_option"><span class="glyphicon"></span>' + all_iab_tags[i] + '</label>'
				);
			}
		},



		/**
		* setupTagsFilter
		*/
		setupTagsFilter : function() {
			var self = this;

			// find whitelisted CNT tags based on blacklist
			this.ui.cnt_tags_filters
			.each( function(){
				if ( $.inArray( $(this).text(), self.options.cnt_tags_blacklist ) < 0 ) {
					$(this).addClass('whitelisted');
					self.options.cnt_tags_whitelist.push( $(this).text() );
				}
			})
			.on( 'click', function(){
				self.options.cnt_tags_blacklist = [];
				self.options.cnt_tags_whitelist = [];

				$(this).toggleClass('whitelisted');

				self.ui.cnt_tags_filters.filter(':not(.whitelisted)').each(function(){
					self.options.cnt_tags_blacklist.push( $(this).text() );
				});

				self.ui.cnt_tags_filters.filter('.whitelisted').each(function(){
					self.options.cnt_tags_whitelist.push( $(this).text() );
				});

				if ( self.options.cnt_tags_whitelist.length === 0 ) self.noUnits = true;

				// update blocked and selected number
				$('#types_setting').find('.blocked-count').text( self.options.cnt_tags_blacklist.length + ' blocked');
				$('#type_report').text( self.options.cnt_tags_whitelist.length + ' selected');

				// update RPM, detect if settings changed and apply action
				self.ui.slider.slider("option", "change").call( self.ui.slider );
				self.settings_changed( self.checkChanges() );
			});
			
			// find whitelisted IAB tags based on blacklist
			this.ui.iab_tags_filters
			.each( function(){
				if ( $.inArray( $(this).text(), self.options.iab_tags_blacklist ) < 0 ) {
					$(this).addClass('whitelisted');
					self.options.iab_tags_whitelist.push( $(this).text() );
				}
			})
			.on( 'click', function(){
				self.options.iab_tags_blacklist = [];
				self.options.iab_tags_whitelist = [];

				$(this).toggleClass('whitelisted');

				$('#iab_tags > .aq_tags_option').filter(':not(.whitelisted)').each(function(){
					self.options.iab_tags_blacklist.push( $(this).text() );
				});

				$('#iab_tags > .aq_tags_option').filter('.whitelisted').each(function(){
					self.options.iab_tags_whitelist.push( $(this).text() );
				});

				if ( self.options.iab_tags_whitelist.length === 0 ) self.noUnits = true;

				$('#select-all, #deselect-all').show();
				if ( self.options.iab_tags_blacklist.length === 0 ) $('#select-all').hide();
				if ( self.options.iab_tags_whitelist.length === 0 ) $('#deselect-all').hide();

				if ($(this).attr('id') === 'select-all'){
					// $(this).removeClass('whitelisted');
					$(this).hide();
					$('#deselect-all').show();
					$('#iab_tags > label').addClass('whitelisted');
					self.options.iab_tags_whitelist = self.options.tag.iab_category.all;
					self.options.iab_tags_blacklist = [];
				}

				if ($(this).attr('id') === 'deselect-all'){
					// $(this).removeClass('whitelisted');
					$(this).hide();
					$('#select-all').show();
					$('#iab_tags > label').removeClass('whitelisted');
					self.options.iab_tags_blacklist = self.options.tag.iab_category.all;
					self.options.iab_tags_whitelist = [];
				}

				// update blocked and selected number
				$('#categories_setting').find('.blocked-count').text( self.options.iab_tags_blacklist.length + ' blocked');
				$('#category_report').text( self.options.iab_tags_whitelist.length + ' selected');

				// update RPM, detect if settings changed and apply action
				self.ui.slider.slider("option", "change").call( self.ui.slider );
				self.settings_changed( self.checkChanges() );
			});
		},



		/**
		* Sets up and handle slider changes
		*/
		setupSlider : function() {
			var self = this;

			this.ui.slider = $( this.options.slider_selector );

			if ( !this.ui.slider.length ) return false;

			this.ui.slider.slider({
				range : true,
				min: 0,
				max: self.options.valMap.length - 1,
				values: [ Math.max( 0, self.getMapIndex(this.options.minValue) ), Math.min( self.getMapIndex(this.options.maxValue), 3 ) ],
				slide : function( event, ui ){
					// make use of native ui para to get the precise maturity value
					if (ui) {
						if ( ui.values[0] !== self.options.minValue ) {
							self.ui.slider.cancelChange = true;
							return false;
						}
						if ( self.options.valMap[ui.values[1]] > self.options.maxValue )
							self.ui.slider_text.html( '<span class="mat-setting"><span class="glyphicon glyphicon-hand-right"></span>Setting: ' + ( ui.values[1]+1 ) + '</span>');
						if ( self.options.valMap[ui.values[1]] < self.options.maxValue )
							self.ui.slider_text.html( '<span class="mat-setting"><span class="glyphicon glyphicon-hand-left"></span>Setting: ' + ( ui.values[1]+1 ) + '</span>');
						self.ui.slider.cancelChange = false;
						self.options.minValue = self.options.valMap[ui.values[0]];
						self.options.maxValue = self.options.valMap[ui.values[1]];
					} else {
						self.options.minValue = self.options.valMap[self.ui.slider.slider("values")[0]];
						self.options.maxValue = self.options.valMap[self.ui.slider.slider("values")[1]];
					}

					// detect if settings changed and apply action
					self.settings_changed( self.checkChanges() );
				},
				change: function() {
					if( self.ui.slider.cancelChange ) return false;
					
					// abort all previous requests before making a new one
					self.abortAll();

					// When slider change is finished, make API call to update RPM, sending slider value and blk list
					$.ajax({
						beforeSend: function( jqXHR ) {
							self.ui.projected_rpm.html(' ... ');
							self.ui.rpm_difference.hide();
							
							if ( this.initialized ) this.xhrPool.push( jqXHR );
						},
						url		: self.options.rpm_api_url,
						data 	: {
							domainid 	: self.options.domainid,
							minValue 	: self.options.minValue,
							maxValue 	: self.options.maxValue,
							taglist_bl	: self.options.cnt_tags_blacklist.concat( self.options.iab_tags_blacklist )
						},
						dataType: "json",
						success	: function( data ) {
							self.update_projected_rpm( data );
						},
						error	: function( jqXHR ){
							//If either of these are true, then it's not a true error and we don't care
						    if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

							console.log( "RPM REQUEST COMM ERROR" );
						}
					});

					self.ui.slider_text.html( '<span class="mat-setting"><span class="glyphicon glyphicon-hand-up"></span>Setting: ' + ( self.getMapIndex(self.options.maxValue)+1 ) + '</span>');
					if( self.inPreview ) self.filterPreview();
					if( !self.inPreview ) {
						self.options.pageCount = 1;
						self.loadData();
					}
				}
			});

			// Initialize the UI
			if ( this.ui.slider.length ) {
				this.ui.slider.slider("option", "slide").call( this.ui.slider );
				this.ui.slider.slider("option", "change").call( this.ui.slider );
			}
		},



		/**
		* Updates the RPM UI, calculates the difference between real and projected
		*/
		update_projected_rpm : function( data ) {

			if( this.noUnits ) {
				data.projected_rpm = 0.00;
				this.noUnits = false;
			}

			var diff = Math.round( (data.projected_rpm - data.real_rpm) * 100 ) / 100;

			this.ui.current_rpm.html( this.options.currency + data.real_rpm.toFixed( this.options.decimalNum ) ).fadeIn( this.options.fadeSpeed );
			this.ui.projected_rpm.html( this.options.currency + data.projected_rpm.toFixed( this.options.decimalNum) ).fadeIn( this.options.fadeSpeed );

			// handling the difference is 0 situation
			if(diff === 0){
				this.ui.rpm_difference.fadeIn( this.options.fadeSpeed )
					.find( 'img' ).hide().end()
					.find( '.metric_number' ).html( this.options.currency + Math.abs(diff).toFixed( this.options.decimalNum) ).css( "color", "rgb(168, 168, 168)" );
			} else {
				this.ui.rpm_difference.fadeIn( this.options.fadeSpeed )
					.find( 'img' ).show().attr( 'src', ( diff > 0 ? this.options.arrow_up_url : this.options.arrow_down_url ) ).end()
					.find( '.metric_number' ).html( this.options.currency + Math.abs(diff).toFixed( this.options.decimalNum) ).css( "color", diff >= 0 ? "green" : "red" );
			}
		},



		/**
		* insert units from api response directly to DOM
		*/
		insertUnits : function(){
			var self = this,
				unitsSet = self._units.current;

			self.ui.units_display.find('.aq_unit').remove();
			$(document).scrollTop(0);

			if ( self.options.is_blocked && self.options.blockMenu === 'newly_blocked' ){
				// iterate the object to insert units
				for ( var prop in self._units.new_blk ) {
					if ( self._units.new_blk.hasOwnProperty(prop) ) {
						self.ui.units_display.append( $(self._units.new_blk[prop]).fadeIn( self.options.fadeSpeed ) );
					}
				}

				self.ui.results_num.text('Showing ' +  self._units.blacklist.length + ' Results');
			} else {
				// otherwise iterate units from array and insert
				var tmp;

				for( var i=0, j = unitsSet.length; i < j; i++ ) {
					// Update the UI according to current settings, then add them to the HTML
					tmp = $( self.tmpl( self.options.instance == 'aq' ? self._tmpl.solr_unit : self._tmpl.tx_solr_unit, unitsSet[i] ) );
					self.ui.units_display.append( tmp );
					tmp.delay(200).fadeIn(200);
				}

				self.options.unitHeight = tmp ? tmp.outerHeight(true) : 0;
			}

			self.ui.units_loading.hide();
		},



		/**
		* Process a template, replacing the variables and conditionals with object properties
		*/
		tmpl : function( tmpl, vals ) {
    		var self = this,
    			rgxp = /#\{([^{}]*)}/g, 
    			repr;
    		
			tmpl = tmpl || '';
			vals = vals || {};
    		
    		repr = function ( str, match ) {
    			var type =typeof vals[match], 
    				t = 1,
    				f = 0,
    				cond;

    			if( ( cond = match.split(/[\?|]+/) ).length == 3 && typeof vals[ cond[0] ] != 'undefined' ) {
    				type = 'boolean';
    				match = cond[0];
    				t = cond[1];
    				f = cond[2];
    			}

    			switch ( type  ) {
    				case 'string':
    				case 'number':
    					return vals[match];
    				break;

    				case 'function':
    					return vals[match]( vals );
    				break;

    				case 'boolean':
    					return vals[match] ? t : f;
    				break;

    				default:
    					return str;
    				break;
    			}
			};
			
			return tmpl.replace( rgxp, repr );
		},



		/**
		* Block or Unblock an unit by OPEDID
		*/
		toggle_block_unit : function( api_type, OPEDID ) {
			var self = this;

			$.ajax({
				url		: self.options.toggle_block_url,
				data 	: {
					domainid 	: self.options.domainid,
					type 		: api_type,
					id  		: OPEDID
				},
				success	: function() {
					// when the action is BLOCK
					if ( api_type === 'unit' ){ }
							
					// when the action is UNBLOCK
					if ( api_type === 'uunit' ){ }
				},
				error : function( jqXHR ){
					self.debug( "BLOCK/UNBLOCK INDIVIDUAL UNIT COMM ERROR" );
				}
			});
		},



		/**
		* Handles overlay clicks to block/unblock units
		*/
		enableBlock: function(){
			var self = this;

			this.ui.units_display.on("click", ".overlay", function(){
				var overlay = $(this),
					ad = overlay.closest( self.options.units_selector ),
					original_id = ad.attr('id').replace('unit_', '').replace('srlt_', '');

				if ( ad.is(".blocked") ) {
					ad.removeClass('blocked').find('.overlay span').html( 'CLICK TO BLOCK' );
					
					// send unblock API
					self._whitelist( original_id );
					self.toggle_block_unit( 'uunit', original_id );
					
					if ( self.options.blockMenu === 'all_blocked' ) 
						self.ui.results_num.text('Showing ' +  ( --self._units.total_bl_count ) + ' Results');
					if ( self.options.blockMenu === 'newly_blocked' )
						self.ui.results_num.text('Showing ' +  ( self._units.blacklist.length ) + ' Results');

					delete self._units.new_blk[original_id];
				} else {
					ad.addClass('blocked').find('.overlay span').html( 'CLICK TO UNBLOCK' );
					
					// send block API
					self._blacklist( original_id );
					self.toggle_block_unit( 'unit', original_id );
					self.ui.results_num.text('Showing ' +  ( --self._units.total_count ) + ' Results');

					self._units.new_blk[original_id] = ad[0];
				}

				// Update the current units if in normal mode
				if ( !self.inPreview ) ad.fadeOut( self.options.fadeSpeed );
			});
		},



		/**
		* Adds an OPEDID to the blacklist making sure it's not on the whitelist
		*/
		_blacklist : function( OPEDID ) {
			if ( $.inArray( OPEDID, this._units.blacklist ) == -1 ) {
				this._units.blacklist.push( OPEDID );
			}

			if ( $.inArray( OPEDID, this._units.whitelist ) >= 0 ) {
				this._units.whitelist = $.grep( this._units.whitelist, function( value ) { return value != OPEDID; } );
			}

			this.debug( this._units );
		},



		/**
		* Adds an OPEDID to the whitelist making sure it's not on the blacklist
		*/
		_whitelist : function( OPEDID ) {
			if ( $.inArray( OPEDID, this._units.whitelist ) == -1 ) {
				this._units.whitelist.push( OPEDID );
			}

			if ( $.inArray( OPEDID, this._units.blacklist ) >= 0 ) {
				this._units.blacklist = $.grep( this._units.blacklist, function( value ) { return value != OPEDID; } );
			}

			this.debug( this._units );
		},



		_iab_category_list : function( data ) {
			var i, result = ''; // &#10003;

			if ( typeof data.quality_tags !== 'undefined' && data.quality_tags !== null && data.quality_tags.length ) {
				for( i in data.quality_tags ) {
					if ( data.quality_tags.hasOwnProperty(i) )
						result += this.tmpl( this._tmpl.tag, { tag: data.quality_tags[i] } );
				}
			}

			return result;
		},



		_content_type_list : function( data ) {
			var i, result = ''; // &#10003;

			if ( typeof data.content_type !== 'undefined' && data.content_type !== null && data.content_type.length ) {
				for( i in data.content_type ) {
					if ( data.content_type.hasOwnProperty(i) )
						result += this.tmpl( this._tmpl.tag, { tag: data.content_type[i] } );
						// result += this.tmpl( this._tmpl.tag, { tag: data.content_type[i].charAt(0) } );
				}
			}

			return result;
		},



		/**
		* Controls tabs interactions
		*/
		switchTabs : function(){
			var self = this;

		  	// change tab
			$('#units_display_tab .tab').on( "click", function( e ){
				e.preventDefault();

				if( ($(this).attr('id') === 'tab_blocked' ? true : false) === self.options.is_blocked ) return false;

				if ( $(this).attr("id") === "tab_active" ){
					// Show only the non-blocked units
					self.options.is_blocked = false;
					$('#left_bar').removeClass('block-mode');
					self.ui.paginator_container.show();
					$('#sort_dropdown').show();
				}

				if ( $(this).attr("id") === "tab_blocked" ){
					// Show only blocked units
					self.options.is_blocked = true;
					$('#left_bar').addClass('block-mode');
					self.ui.paginator_container.hide();
					$('#sort_dropdown').hide();
				}

				$(this).addClass("selected").siblings().removeClass("selected");
				
				// reset for new units injection
				self.options.pageCount = 1;
				self.loadData();
			});
		},



		/**
		* Search page pop up in an overlay, send search api when hit 'Enter'
		*/
		enableSearch : function() {
			var self = this;

			// trigger search overlay
			$('#search_trigger').on('click', function(){
				self.ui.s_units_loading.hide();
				$('#search_overlay').show();
				$('#search-container input').focus();
				$('body').addClass('no_scroll');
			});

			// close search overlay
			$('#search_overlay, #close-search').on('click', function( e ){
				if (e.target === this){
					$('#search_overlay').hide();
					$('body').removeClass('no_scroll');

					// clear pageCount, search term and search results after closing search
					self.options.pageCountSearch = 1;
					self.options.pageMaxSearch = 1;
					$('#search-container input').val('');
					$('#search_term').text(' type and press "Enter" to search ');
					$('#search_result .aq_unit').remove();
					$('#search-paginator').hide();
				}
			});

			// enable block within search
			$('#search_result').on("click", ".overlay", function(){
				var overlay = $(this),
					ad = overlay.closest( self.options.units_selector ),
					original_id = ad.attr('id').replace('srlt_', '');

				if ( ad.is(".blocked") ) {
					// update UI for the same unit on both the search page and main page
					ad.removeClass('blocked').find('.overlay span').html( 'CLICK TO BLOCK' );
					
					self._whitelist( original_id );
					self.toggle_block_unit( 'uunit', original_id );
					delete self._units.new_blk[original_id];
				} else {
					// update UI for the same unit on both the search page and main page
					ad.addClass('blocked').find('.overlay span').html( 'CLICK TO UNBLOCK' );

					self._blacklist( original_id );
					self.toggle_block_unit( 'unit', original_id );
					self._units.new_blk[original_id] = ad;
				}

				// refresh main units display UI
				self.loadData();
			});

			// send search api when hit enter 'enter'
			$('#search-container input').on('keyup', function(e){
				if ( $(this).val().replace(/\s/g,"") === '' ) return;

				if(e.which === 13) {
					self.loadBySearch( 1 );
			    }
			});

			// bind api call with paginator in search
			$('#search-paginator .glyphicon').on( "click", function(){
				var paginator = $(this);

				if( paginator.attr("id") === 'prev') {
					// don't perform search for prev button when it's on the first page
					if ( (self.options.pageCountSearch - 1) === 0 ) return;
						
					self.loadBySearch( --self.options.pageCountSearch );
				}

				if( paginator.attr("id") === 'next') {
					// don't perform search for next button when it's on the last page
					if ( (self.options.pageCountSearch + 1) > self.options.pageMaxSearch ) return;

					self.loadBySearch( ++self.options.pageCountSearch );
				}
			});
		},



		/**
		* Search page pop up in an overlay, send search api when hit 'Enter'
		*/
		loadBySearch : function( pageNum ) {
			var self = this;

			// clear previous search
			$('#search_result .aq_unit').remove();
			self.ui.s_units_loading.show();
			$('#search-paginator').hide();

			$('#search_term').text( 'Hang on, gathering results for you...' );

			$.ajax({
				url  	: self.options.load_api_url,
				data 	: {
					tsearch	 		: $('#search-container input').val(),
					domainid 		: self.options.domainid,
					numUnits		: self.options.numUnitsSearch,
					offset	 		: (pageNum - 1) * self.options.numUnitsSearch,
					lowMat	 		: self.options.minValue,
					highMat  		: self.options.maxValue,
					blAdvs	 		: self.options.advertiser_blklist,
					blCTypes 		: self.options.cnt_tags_blacklist,
					blIabTags		: self.options.iab_tags_blacklist
				},
				dataType: "json",
				success	: function( data ) {
					// remove spinning wheel and clear units in the object
					self.ui.s_units_loading.hide();
					self._units.search.length = 0;

					// if it's a bad call
					if ( data === null){
						$('#search_term').text( 'something is not right, please try again' );
						return false;
					}

					// get max page number
					self.options.pageMaxSearch = (data.total_count % self.options.numUnitsSearch === 0) ? ( parseInt(data.total_count / self.options.numUnitsSearch) ) : ( (parseInt(data.total_count / self.options.numUnitsSearch)) + 1 );

					if ( data.units === undefined || data.units === null ){
						
						$('#search_term').text( 'no search results for "' + $('#search-container input').val() + '"' );
						return;
					}

					var i, j, start_index = 0;

					for( i=0, j=data.units.length; i < j; i++ ) {
						// Add index and selector properties to units, append them to the _units.search array
						data.units[i]._index = i + start_index;
						data.units[i].iab_category_list = function( data ) { return self._iab_category_list( data ); };
						data.units[i].content_type_list = function( data ) { return self._content_type_list( data ); };
						data.units[i]._selector = self.tmpl( self._tmpl.srlt_selector, data.units[i] );

						// apply BLOCK or NOT style based on OPEDID blacklist/whitelist
						if ( $.inArray( data.units[i].OPEDID, self._units.blacklist ) >= 0 ) {
							data.units[i].blocked = 1;
						}

						if ( $.inArray( data.units[i].OPEDID, self._units.whitelist ) >= 0 ) {
							data.units[i].blocked = 0;
						}

						self._units.search[i] = data.units[i];
						self._units.search[i].img_maturity_level = self.getMapIndex(self._units.search[i].img_maturity_level)+1;
						self._units.search[i].revenue = self.formatRevenue(self._units.search[i].revenue);
					}

					$('#search_result .aq_unit').remove();
						
					// Update the UI, add the new units to the search overlay HTML
					for( i=0, j= self._units.search.length; i < j; i++ ) {
						var tmp = $( self.tmpl( self.options.instance == 'aq' ? self._tmpl.srlt_unit : self._tmpl.tx_srlt_unit, self._units.search[ i ] ) );
						$('#search_result').append( tmp );
						
						// Animate the newly inserted unit
						tmp.delay(200).fadeIn(200);
					}

					$('#search_term').text( data.units.length + ' search results for "' + $('#search-container input').val() + '"' );
					$('#search-info').text( ((pageNum-1) * self.options.numUnitsSearch + 1) + ' - ' + ( (self.options.pageCountSearch < self.options.pageMaxSearch) ? ( pageNum * self.options.numUnitsSearch ) : data.total_count ) + ' of ' + data.total_count );
					/* 
					 * no pagination on search
					 * $('#search-paginator').show();
					 */
				},
				error	: function( jqXHR ){
					self.debug( "SEARCH REQUEST COMM ERROR" );
				}
			});
		},



		/**
		* get the index number mapping to maturity value
		*/
		getMapIndex : function( maturity ) {
			for ( var i = 0, len = this.options.valMap.length - 1 ; i < len ; i++ ){
		        if ( this.options.valMap[i] === maturity )
		            return i;
		        
		        if ( this.options.valMap[ len ] === maturity )
		            return len;
		        
		        if ( this.options.valMap[i] < maturity && maturity < this.options.valMap[i+1] ){
		            return ((maturity - this.options.valMap[i]) < (this.options.valMap[i+1] - maturity)) ? i : ( i+1 );
		        }
			}
		},



		/**
		* detect scroll and switch to fixed positioning when necessary
		*/
		positionSwitch : function() {
			var self = this;
				
			var adjustLeftNav = function(){
				var minWinHeight = 800;
				if ( $(window).outerHeight(true) < minWinHeight ){
					$('#left_bar').css('height', ($(window).outerHeight(true) -270) + 'px');
					$('#left_bar').css('overflow-y', 'scroll');
				} else {
					$('#left_bar').css('height', 'auto');
				}
			};

			$(window).on( 'scroll', function( e ){
				var topPos 		 = 50,
					topTabHeight = 47,
					unitsPerRow  = 5,
					totalRows 	 = ( self._units.total_count%unitsPerRow === 0 ) ? ( parseInt(self._units.total_count/unitsPerRow) ) : ( (parseInt(self._units.total_count/unitsPerRow) ) + 1 ),
					rowsInView 	 = Math.ceil(($(window).height() - topTabHeight)/self.options.unitHeight),
					rowsViewed,
					totalProgress;

				if ( $(this).scrollTop() > topPos ){
					$('body').addClass('on-scroll');
					rowsViewed = parseInt( ($(this).scrollTop() - topPos)/self.options.unitHeight ) + rowsInView + (self.options.pageCount - 1)*(self.options.numUnits/unitsPerRow);
				} else {
					$('body').removeClass('on-scroll');
					rowsViewed = rowsInView + (self.options.pageCount - 1)*(self.options.numUnits/unitsPerRow);
				}

				totalProgress = Math.min( parseInt( rowsViewed*100*10/totalRows )/10, 100 );

				self.ui.progress_bar.progressbar({ value: totalProgress });
				self.ui.progress_text.text('Your Progress: ' + totalProgress + '%');
			});

			// $(window).on( 'resize', function(){ adjustLeftNav(); });
			// adjustLeftNav();
		},



		/**
		* sort by maturity
		*/
		enableSort : function() {
			var self = this;

			$('#sort_dropdown').on('click', 'li', function( e ){
				if( ($(this).attr('id') === 'mat_asc' ? true : false) === self.options.is_asc ) return false;

				$('#sort_dropdown li').addClass('sort-not-selected');

				if( $(this).attr('id') == 'mat_asc' ) {
					self.options.is_asc = true;
					$('#sort').html('<span class="glyphicon glyphicon-arrow-up"></span>');
				}
				if( $(this).attr('id') == 'mat_desc' ) {
					self.options.is_asc = false;
					$('#sort').html('<span class="glyphicon glyphicon-arrow-down"></span>');
				}

				$(this).removeClass('sort-not-selected');
				$(this).parent().hide();

				// reset for new units injection
				self.ui.units_display.find('.aq_unit').remove();
				self._units.all.length = 0;
				self.options.pageCount = 1;
				self.loadData();
			});
		},



		/**
		* load advertisers for the current domain id
		*/
		loadAdvertisers : function() {
			var self = this;

			$.ajax({
				url  	: self.options.advertiser_url,
				data 	: {
					domainid : self.options.domainid
				},
				dataType: "json",
				success	: function( data ) {
					self.options.totalAdvNum = data.total;
					self.options.blockedAdvNum = 0;

					for (var i = 0, len = data.total ; i < len ; i++ ){
						var advertiser_unit = self.tmpl( self._tmpl.advertiser_unit, data.advertisers[i] );
						$('#advertiser_list').append( advertiser_unit );

						if ( data.advertisers[i].blocked ) self.options.blockedAdvNum++;
					}

					$('#advertisers_setting').find('.blocked-count').text( self.options.blockedAdvNum + ' blocked');
					$('#advertisers_report').text( (self.options.totalAdvNum - self.options.blockedAdvNum) + ' selected');

					$('#advertiser_list .btn').on('click', function( event ){
						event.preventDefault();
						var ad_ref = $(this).parent();

						if( $(this).text().indexOf('Block') > -1 ){
							self.toggleBlockAdv( 'adv', ad_ref );
						}

						else if( $(this).text().indexOf('Unblock') > -1 ){
							self.toggleBlockAdv( 'uadv', ad_ref );
						}

						else if( $(this).text().indexOf('Preview') > -1 ){
							if (ad_ref.hasClass( "advertiser-blocked" )) return false;
							
							// enter into preview mode
							$('.preview-advertiser.btn').removeClass('active');
							$(this).addClass('active');

							self.options.advertiserId   = ad_ref.attr('id').substring(4);
							self.options.advertiserName = ad_ref.find('.advertiser-name').text();
							self.previewUnits();
						}
					});

				},
				error	: function( jqXHR ){
					self.debug( "LOAD ADVERTISERS COMM ERROR" );
				}
			});			
		},


		/**
		* load TX partners for the current domain id
		*/
		loadTxPartners : function() {
			var self = this;

			$.ajax({
				url  	: self.options.advertiser_url,
				data 	: {
					domainid : self.options.domainid
				},
				dataType: "json",
				success	: function( data ) {
					self.options.totalAdvNum = data.total;
					self.options.blockedAdvNum = 0;

					for (var i = 0, len = data.total ; i < len ; i++ ){
						var partner_unit = self.tmpl( self._tmpl.partner_unit, data.partners[i] );
						$('#advertiser_list').append( partner_unit );

						if ( data.partners[i].blocked ) self.options.blockedAdvNum++;
					}

					$('#advertisers_setting').find('.blocked-count').text( self.options.blockedAdvNum + ' blocked');
					$('#advertisers_report').text( (self.options.totalAdvNum - self.options.blockedAdvNum) + ' selected');

					$('#advertiser_list .btn').on('click', function( event ){
						event.preventDefault();
						var ad_ref = $(this).parent();

						if( $(this).text().indexOf('Block') > -1 ){
							self.toggleBlockAdv( 'txp', ad_ref );
						}

						else if( $(this).text().indexOf('Unblock') > -1 ){
							self.toggleBlockAdv( 'utxp', ad_ref );
						}

						else if( $(this).text().indexOf('Preview') > -1 ){
							if (ad_ref.hasClass( "partner-blocked" )) return false;
							
							// enter into preview mode
							$('.preview-partner.btn').removeClass('active');
							$(this).addClass('active');

							self.options.advertiserId   = ad_ref.attr('id').substring(4);
							self.options.advertiserName = ad_ref.find('.partner-name').text();
							self.previewUnits();
						}
					});

				},
				error	: function( jqXHR ){
					self.debug( "LOAD ADVERTISERS COMM ERROR" );
				}
			});			
		},



		toggleBlockAdv : function( api_type, ad_ref ){
			var id = ad_ref.attr('id').substring(4);
			var css_class = this.options.instance == 'aq' ? 'advertiser' : 'partner';

			// Back to regular mode for advertiser block/unblock
			this.ui.close_preview.trigger('click');

			// when the action is BLOCK
			if ( api_type === 'adv' || api_type === 'txp' ){
				// if advertiser id is in whitelist, remove it; otherwise add to blacklist
				if ( $.inArray(id, this.options.advertiser_whtlist) > -1 )
					this.options.advertiser_whtlist = $.grep( this.options.advertiser_whtlist, function( value ) { return value != id; } );
				else 
					this.options.advertiser_blklist.push( id );

				this.options.blockedAdvNum++;
				ad_ref.addClass(css_class + '-blocked');
				ad_ref.find('.toggle-' + css_class).html('<span class="glyphicon"></span> Unblock ');
			}
			// when the action is UNBLOCK
			if ( api_type === 'uadv' || api_type === 'utxp' ){
				// if advertiser id is in blacklist, remove it; otherwise add to whitelist
				if ( $.inArray(id, this.options.advertiser_blklist) > -1 )
					this.options.advertiser_blklist = $.grep( this.options.advertiser_blklist, function( value ) { return value != id; } );
				else
					this.options.advertiser_whtlist.push( id );

				this.options.blockedAdvNum--;
				ad_ref.removeClass(css_class + '-blocked');
				ad_ref.find('.toggle-' + css_class).html('<span class="glyphicon"></span> Block ');
			}

			$('#advertisers_setting').find('.blocked-count').text( this.options.blockedAdvNum + ' blocked');
			$('#advertisers_report').text( (this.options.totalAdvNum - this.options.blockedAdvNum) + ' selected');

			// update RPM by calling the slider functions, filter units as well
			if ( this.options.instance == 'aq' ) {
				this.ui.slider.slider("option", "change").call( this.ui.slider );
			}
			this.settings_changed( this.checkChanges() );
		},



		confirmBlockAdv : function(){
			var i, len,
				advBlkList = this.options.advertiser_blklist,
				advWhtList = this.options.advertiser_whtlist;

			for ( i = 0, len = advBlkList.length; i < len; i++ ){
				$.ajax({
					url		: this.options.toggle_block_url,
					data 	: {
						domainid 	: this.options.domainid,
						type 		: 'adv',
						id  		: advBlkList[i]
					},
					success	: function() {
						console.log( 'block adv successfully' );
					},
					error : function( jqXHR ){
						console.log( "BLOCK/UNBLOCK ADVERTISER COMM ERROR" );
					}
				});
			}

			for ( i = 0, len = advWhtList.length; i < len; i++ ){
				$.ajax({
					url		: this.options.toggle_block_url,
					data 	: {
						domainid 	: this.options.domainid,
						type 		: 'uadv',
						id  		: advWhtList[i]
					},
					success	: function() {
						console.log( 'unblock adv successfully' );
					},
					error : function( jqXHR ){
						console.log( "BLOCK/UNBLOCK ADVERTISER COMM ERROR" );
					}
				});
			}
		},



		previewUnits : function( pageNum ){
			var self = this;

			pageNum = pageNum || 1;
			self.options.pageMaxPreview = 9999;
			self.ui.no_units.hide();
			self.ui.units_loading.show();
			self.ui.results_num.text( 'Calculating ... ' );

			$('body').addClass('in-preview');
			$('#preview_summary').html('Hang on, loading units from <span>"' + self.options.advertiserName + '"</span>...');

			$.ajax({
				url  	: self.options.load_api_url,
				data 	: {
					domainid 	 : self.options.domainid,
					advertiserid : self.options.advertiserId
				},
				dataType: "json",
				success	: function( data ) {
					self.inPreview = true;
					self.ui.units_display.find('.aq_unit').remove();
					self.ui.paginator_container.hide();

					// if there are no units available
					if ( data === null){
						self.ui.no_units.show().html(
							'<h1>Something is not right, please try again.</h1>' +
							'<a class="refresh btn btn-primary">try again</>'
						);
						self.ui.units_loading.hide();
						self.ui.results_num.text( '' );
						return false;
					}
					
					if ( data.total_count === 0 ){
						$('#preview_summary').html('No Results Found. Campaigns from <span>"' + self.options.advertiserName + '"</span> are Currently Not Live.');
						self._units.preview.length = 0;
						self.filterPreview();
						return false;
					} else {
						$('#preview_summary').html('Showing <span id="preview_num">' + (data.units.length - data.total_bl_count) + '</span> Results from <span>"' + self.options.advertiserName + '"</span>');
					}

					for( var i = 0, j = data.units.length; i < j; i++ ) {
						data.units[i].iab_category_list = function( data ) { return self._iab_category_list( data ); };
						data.units[i].content_type_list = function( data ) { return self._content_type_list( data ); };
						data.units[i]._selector = self.tmpl( self._tmpl.unit_selector, data.units[i] );
						
						// apply BLOCK or NOT style based on OPEDID blacklist/whitelist
						if ( $.inArray( data.units[i].OPEDID, self._units.blacklist ) >= 0 ) {
							data.units[i].blocked = 1;
						}

						if ( $.inArray( data.units[i].OPEDID, self._units.whitelist ) >= 0 ) {
							data.units[i].blocked = 0;
						}

						self._units.preview[i] = data.units[i];
						self._units.preview[i].img_maturity_level = self.getMapIndex(self._units.preview[i].img_maturity_level)+1;
						self._units.preview[i].revenue = self.formatRevenue(self._units.preview[i].revenue);
					}

					self.filterPreview();
				},
				error : function( jqXHR ){
					self.debug( "ADVERTISER PREVIEW REQUEST COMM ERROR" );
				}
			});
		},



		/**
		* a sequence of actions before turn on or off preview mode0
		*/
		closePreview : function(){
			var self = this;
			
			self.ui.close_preview.on('click', function(){
				$('.preview-advertiser.btn').removeClass('active');
				self.inPreview = false;
				self.ui.paginator_container.show();
				self.ui.no_units.hide();
				
				// Update the UI in normal mode
				$(self).trigger("filter_changed");
				$('body').removeClass('in-preview');
			});
		},



		/**
		* refresh the page when api call fails or time out
		*/
		refreshCall : function(){
			var self = this;
			
			self.ui.no_units.on('click', '.refresh', function(){
				return self.inPreview ? self.previewUnits() : self.loadData();
			});
		},



		/**
		* Abort all function
		*/
		abortAll : function() {

			if ( this.xhrPool.length !== 0 ){
				for( var i = 0 ; i < this.xhrPool.length ; i++ )
					this.xhrPool[i].abort();

				// empty the original array
			    this.xhrPool.length = 0;
			    console.log( 'aborted all active requests' );
			} else {
				console.log( 'no request to abort' );
			}
		},



		/**
		* check if any filter/setting has changed
		*/
		checkChanges : function() {
			var mat_changed   = true,
				cnt_changed   = true,
				iab_changed   = true,
				adv_changed   = true,
				speed         = this.options.fadeSpeed,
				matUISign     = $('.slider-container .filter-title > .glyphicon'),
				cntUISign     = $('.types-setting .filter-title > .glyphicon'),
				iabUISign     = $('.categories-setting .filter-title > .glyphicon'),
				advUISign     = $('.advertisers-setting .filter-title > .glyphicon');

			// hide the cache status panel
			$('#settings_status').hide();

			if ( this.originalSettings.org_min_value === this.options.minValue && 
				 this.originalSettings.org_max_value === this.options.maxValue ){
				mat_changed = false;
				matUISign.fadeOut(speed);
			} else {
				matUISign.fadeIn(speed);
			}

			if ( $(this.originalSettings.org_cnt_blklist).not(this.options.cnt_tags_blacklist).length === 0 &&
				 $(this.options.cnt_tags_blacklist).not(this.originalSettings.org_cnt_blklist).length === 0 ){
				cnt_changed = false;
				cntUISign.fadeOut(speed);
			} else {
				cntUISign.fadeIn(speed);
			}

			if ( $(this.originalSettings.org_iab_blklist).not(this.options.iab_tags_blacklist).length === 0 &&
				 $(this.options.iab_tags_blacklist).not(this.originalSettings.org_iab_blklist).length === 0 ) {
				iab_changed = false;
				iabUISign.fadeOut(speed);
			} else {
				iabUISign.fadeIn(speed);
			}

			if ( this.options.advertiser_blklist.length === 0 && this.options.advertiser_whtlist.length === 0 ) {
				adv_changed = false;
				advUISign.fadeOut(speed);
			} else {
				advUISign.fadeIn(speed);
			}

			return ( mat_changed || cnt_changed || iab_changed || adv_changed );
		},



		/**
		* show different blocked units based on options
		*/
		showBlocked : function() {
			var self = this;

			$('#block_menu .btn').click('click', function(){
				var btn = $(this);

				if ( self.options.blockMenu === btn.attr('id') ) return;

				$('#block_menu .btn').removeClass('selected');
				btn.addClass('selected');
				self.options.blockMenu = btn.attr('id');
				self.loadData();
			});
		},



		/**
		* apply various states when settings changed or not
		*/
		settings_changed : function( is_changed ){
			// when settings are changed but unsaved
			if( is_changed ){
				this._dirty = true;
				this.ui.save_settings.addClass('settings-changed');

				// start to reveal Projected RPM and difference only when settings start to change
				this.ui.rpm_difference.css('visibility', 'visible');
				$('#projected_rpm').css('visibility', 'visible');
			} else {
				// when settings remain unchanged
				this._dirty = false;
				this.ui.save_settings.removeClass('settings-changed');
			}
		},



		/**
		* filter previewed units in the DOM
		*/
		filterPreview : function(){
			var self = this;

			self.ui.units_display.find('.aq_unit').remove();

			for( var i = 0, j = self._units.preview.length; i < j; i++ ) {
				// Filter by slider settigs
				if ( self.options.instance == 'tx' || ( self._units.preview[i].img_maturity_level >= (self.getMapIndex(self.options.minValue)+1) && self._units.preview[i].img_maturity_level <= (self.getMapIndex(self.options.maxValue)+1) ) ) {
					var has_bl_tag = false, tmp;

					has_bl_tag = has_bl_tag || ( $.map( self.options.iab_tags_blacklist, function(a){ return $.inArray( a, self._units.preview[i].quality_tags ) < 0 ? null : a; } ).length > 0 );
					has_bl_tag = has_bl_tag || ( $.map( self.options.cnt_tags_blacklist, function(a){ return $.inArray( a, self._units.preview[i].content_type ) < 0 ? null : a; } ).length > 0 );

					// If in blacklist, no unit is allowed no matter which tab
					if( has_bl_tag) continue;

					// Update the UI according to current settings, then add them to the HTML
					tmp = $( self.tmpl( self.options.instance == 'aq' ? self._tmpl.solr_unit : self._tmpl.tx_solr_unit, self._units.preview[i] ) );
					self.ui.units_display.append( tmp );
					tmp.delay(200).fadeIn(200);
				}
			}

			$('#preview_num').text( self.ui.units_display.children('.aq_unit').length );
			self.ui.units_loading.hide();
		},



		/**
		* Controls tabs interactions
		*/
		saveSettings : function(){
			var self = this;
			
			$('#tab_save').on( "click", function( e ){
				// if no changes are made, ignore 
				if ( !self._dirty ) return;
						
				// abort all previous requests before making a new one
				self.abortAll();
				self.hitSave = true;
				
				// Save BLOCK/UNBLOCK advertisers
				var i, len, 
					saveBlockAdv, saveUBlockAdv, saveOthers,
					advBlkList = self.options.advertiser_blklist,
					advWhtList = self.options.advertiser_whtlist,
					saveSign   = $('.filter-title > .glyphicon');

				saveSign.fadeOut(self.options.fadeSpeed);
				$('#tab_save').text('Saving Settings...');

				for ( i = 0, len = advBlkList.length; i < len; i++ ){
					saveBlockAdv = $.ajax({
						url		: self.options.toggle_block_url,
						data 	: {
							domainid 	: self.options.domainid,
							type 		: 'adv',
							id  		: advBlkList[i]
						},
						success	: function() {
							console.log( 'block adv successfully' );
						},
						error : function( jqXHR ){
							self.debug( "BLOCK/UNBLOCK ADVERTISER COMM ERROR" );
						}
					});
				}

				for ( i = 0, len = advWhtList.length; i < len; i++ ){
					saveUBlockAdv = $.ajax({
						url		: self.options.toggle_block_url,
						data 	: {
							domainid 	: self.options.domainid,
							type 		: 'uadv',
							id  		: advWhtList[i]
						},
						success	: function() {
							console.log( 'unblock adv successfully' );
						},
						error : function( jqXHR ){
							self.debug( "BLOCK/UNBLOCK ADVERTISER COMM ERROR" );
						}
					});
				}
						
				// Save Other Settings					
				saveOthers = $.ajax({
					beforeSend: function( jqXHR ) {
						if ( this.initialized )
							self.xhrPool.push( jqXHR );
						},
					url		: self.options.save_api_url,
					data 	: {
						domainid 		: self.options.domainid,
						imgMaturityMin 	: self.options.minValue,
						imgMaturityMax	: self.options.maxValue,
						taglist_bl		: self.options.iab_tags_blacklist.concat( self.options.cnt_tags_blacklist ),
						blacklist 		: self._units.blacklist,
						whitelist 		: self._units.whitelist
					},
					dataType: "json",
					success	: function( data ) {
						console.log( 'other settings saved successfully' );
					},
					error	: function( jqXHR ){
						//If either of these are true, then it's not a true error and we don't care
						if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

						if ( jqXHR.responseText ) {
							bootbox.alert( jqXHR.responseText );
						}
						console.log( "SAVING REQUEST COMM ERROR" );
					}
				});

				// After all save calls are finished
				$.when(saveBlockAdv, saveUBlockAdv, saveOthers).done(function(){
					// change status, reset, etc
					$('#tab_save').text('Settings Saved');
					self.settings_changed( false );

					// save the timestamp to localStorage in the browser
					localStorage['nControl.' + self.options.domainid + '.lastSaved'] = +new Date;

					bootbox.dialog({
						message: "Your changes have been saved, it will take effect in 30 minutes.",
						title: '<span class="glyphicon glyphicon-ok"></span> Good Job!',
						buttons: {
							main: {
								label: "OK",
								className: "btn-primary",
								callback: function() {
									// Refresh the document to load the saved data
									window.location.reload();
								}
							}
						}
					});
				});
			});
		},



		/**
		* Format revenue to show only 3 digits
		*/
		formatRevenue : function( revenue ){
			if ( revenue === undefined || revenue === null ) return -1;

			var decimalPos = revenue.toString().indexOf('.');

			if (decimalPos >= 3) 
				revenue = revenue.toString().substring(0, decimalPos);
			if (decimalPos >= 2) 
				revenue = revenue.toString().substring(0, decimalPos+2);

			return revenue;
		},



		/**
		 * caclculate remaining time for cache to be cleared
		 */
		calcCache: function() {
			var cacheTime = 1800000, // estimated cache time is 30 minutes 1800000 || 60000
				timeElap = +new Date - localStorage['nControl.' + this.options.domainid + '.lastSaved'];

			/**
			 * No need to calculate remaining cache time if:
			 * 1. local storage hasn't been set yet
			 * 2. the cache has already expired
			 */

			if (!localStorage['nControl.' + this.options.domainid + '.lastSaved'] || timeElap > cacheTime) return false;

			// show the status panel if cache hasn't been cleared yet
			$('#settings_status').show();

			var msToTime = function(duration) {
				var milliseconds = parseInt((duration % 1000) / 100),
					seconds = parseInt((duration / 1000) % 60),
					minutes = parseInt((duration / (1000 * 60)) % 60),
					hours = parseInt((duration / (1000 * 60 * 60)) % 24);

				hours = (hours < 10) ? hours : hours;
				minutes = (minutes < 10) ? "0" + minutes : minutes;
				seconds = (seconds < 10) ? "0" + seconds : seconds;

				return ' ' + (hours ? (hours + " hours ") : '') +
					+minutes + " min " + seconds + " seconds ";
			}

			var timer = setInterval(function() {
				if (cacheTime > timeElap) {
					$('#cache_time').text(msToTime(cacheTime - timeElap));
					timeElap = timeElap + 1000;
				} else {
					$('#settings_status').hide();
					clearInterval(timer);
				}
			}, 1000);
		},



		/**
		* Debug output
		*/
		debug : function(){
			if ( !this.options.debug_mode ) return false;

			if ( this.options.browser.msie ) {
				try {
					console.log.apply( console, Array.prototype.slice.call(arguments) );
				} catch( e ) {
					console.log( Array.prototype.slice.call(arguments) );
				}
			} else {
				console.log.apply( console, Array.prototype.slice.call(arguments) );
			}
		},



		/*
		* UI elements, contains actual jQuery DOM elements to manipulate with
		*/
		ui : {},



		/*
		* Properties
		*/
		options : {},



		/*
		* array of uncompleted requests
		*/
		xhrPool : [],



		/*
		* store the original settings
		*/
		originalSettings : {},



		/*
		* if the object has been initialized
		*/
		initialized : false,



		/*
		* how many times the RPM api has been called
		*/
		hitSave : false,



		/*
		* if it's in preview mode
		*/
		inPreview : false,



		/*
		* if there are no units
		*/
		noUnits : false,



		/**
		* Default settings, can be overriden with init options
		*/
		_defaults : {
			instance			: 'aq',
			domainid 			: null,
			rpm 				: null,
			minValue 			: 0,
			maxValue 			: 100,
			valMap				: [0, 50, 75, 100],
			is_asc				: false,
			is_blocked			: false,
			iab_tags_blacklist 	: [],
			iab_tags_whitelist 	: [],
			cnt_tags_blacklist 	: [],
			cnt_tags_whitelist 	: [],
			advertiser_blklist 	: [], // newly blocked advertiser
			advertiser_whtlist  : [], // newly unblocked advertiser
			tx_partner_blklist 	: [], // newly blocked partner
			tx_partner_whtlist  : [], // newly unblocked partner
			numUnits 			: 204,
			numUnitsSearch 		: 12,
			pageCount 			: 1,
			pageCountPreview 	: 1,
			pageCountSearch		: 1,
			pageMax 			: 9999,
			pageMaxPreview 		: 9999,
			pageMaxSearch 		: 9999,
			currency 			: "$",
			decimalNum 			: 2,
			fadeSpeed 			: 800,
			unitHeight 			: 286,
			blockMenu 			: 'all_blocked',
			debug_mode 			: /.*\?.*nrelate_debug=.*/.test( window.location ) || Boolean( window['nr_debug'] ),
			host 				: window.location.origin
		},



		/**
		* Indicates if there are changes pending to be saved
		*/
		_dirty : false,



		/**
		* Constant settings (cannot be overriden by the user)
		*/
		_settings : {
			units_selector 				: ".aq_unit",
			slider_selector             : "#slider_range",
			arrow_down_url 				: "http://css.nrcdn.com/images/Red_Arrow_Down.png",
			arrow_up_url 				: "http://css.nrcdn.com/images/Green_Arrow_Up.png",
			load_api_url 				: "AQAPI/load",
			rpm_api_url					: "AQAPI/rpm",
			save_api_url 				: "AQAPI/save",
			advertiser_url 				: "AQAPI/advertisers",
			toggle_block_url 			: "AQAPI/block"
		},



		/**
		* Global 
		*/
		_units : {
			op_index_map	: {},   // keep the OPEDID to index map to facilitate lookup 
			all 			: [],	// all units downloaded with API::load()
			current 		: [],	// current units in the DOM
			search          : [],   // search result results
			preview         : [],   // advertiser preview results
			new_blk			: [],	// newly blocked units 
			blacklist		: [],	// list of blacklisted OPEDIDs
			whitelist		: [],	// list of whitelisted OPEDIDs
			total_count 	: null, // total number of units assigned to the domain
			total_bl_count 	: null	// total number of units blocked in the domain
		},



		/**
		* Global paginator status
		*/
		_paginator : {
			page : 0
		},



		/**
		* HTML temlates
		* 
		* Use #{property} to replace with object.property
		* Use #{property?val_if_true|val_if_false} to write val_if_true or val_if_false according to object.property value
		*/
		_tmpl : {
			unit_selector	: 	'#unit_#{OPEDID}',
			srlt_selector	: 	'#srlt_#{OPEDID}',
			solr_unit		: 	'<div class="aq_unit#{blocked? blocked|}" id="unit_#{OPEDID}" data-index="#{_index}">' + 
									'<div class="overlay"><span>CLICK TO #{blocked?UNBLOCK|BLOCK}</span></div>' +
									'<div class="aq_image">' +
										'<img src="#{media}" />' +
									'</div>' +
									'<div class="aq_text">' +
										'<p class="post_title">#{title}</p>' +
									'</div>' +
									'<div class="aq_filter clearfix">' +
										'<span class="maturity">#{img_maturity_level}</span>' +
										'<span class="iab_category tag">#{blogtitle}</span>' +
										'<span class="content_type tag">#{content_type_list}</span>' +
										'<span class="unit-revenue tag">$#{revenue}</span>' +
									'</div>' +
									'<div class="aq_sponsor">' +
										'<span>#{iab_category_list}</span>' +
										'<a href="#{link}" target="_blank" class="unit_url"><span class="glyphicon glyphicon-share"></span></a>' +
									'</div>' +
								'</div>',
			tx_solr_unit	: 	'<div class="aq_unit#{blocked? blocked|} tx_unit" id="unit_#{OPEDID}" data-index="#{_index}">' + 
									'<div class="overlay"><span>CLICK TO #{blocked?UNBLOCK|BLOCK}</span></div>' +
									'<div class="aq_image">' +
										'<img src="#{media}" />' +
									'</div>' +
									'<div class="aq_text">' +
										'<p class="post_title">#{title}</p>' +
									'</div>' +
									'<div class="aq_filter clearfix">' +
										'<span class="iab_category tag">#{blogtitle}</span>' +
									'</div>' +
									'<div class="aq_sponsor">' +
										'<a href="#{link}" target="_blank" class="unit_url"><span class="glyphicon glyphicon-share"></span></a>' +
									'</div>' +
								'</div>',
			srlt_unit		: 	'<div class="aq_unit#{blocked? blocked|}" id="srlt_#{OPEDID}" data-index="#{_index}">' + 
									'<div class="overlay"><span>CLICK TO #{blocked?UNBLOCK|BLOCK}</span></div>' +
									'<div class="aq_image">' +
										'<img src="#{media}" />' +
									'</div>' +
									'<div class="aq_text">' +
										'<p class="post_title">#{title}</p>' +
									'</div>' +
									'<div class="aq_filter clearfix">' +
										'<span class="maturity">#{img_maturity_level}</span>' +
										'<span class="iab_category tag">#{blogtitle}</span>' +
										'<span class="content_type tag">#{content_type_list}</span>' +
										'<span class="unit-revenue tag">$#{revenue}</span>' +
									'</div>' +
									'<div class="aq_sponsor">' +
										'<span>#{iab_category_list}</span>' +
										'<a href="#{link}" target="_blank" class="unit_url"><span class="glyphicon glyphicon-share"></span></a>' +
									'</div>' +
								'</div>',
			tx_srlt_unit	: 	'<div class="aq_unit#{blocked? blocked|} tx_unit" id="srlt_#{OPEDID}" data-index="#{_index}">' + 
									'<div class="overlay"><span>CLICK TO #{blocked?UNBLOCK|BLOCK}</span></div>' +
									'<div class="aq_image">' +
										'<img src="#{media}" />' +
									'</div>' +
									'<div class="aq_text">' +
										'<p class="post_title">#{title}</p>' +
									'</div>' +
									'<div class="aq_filter clearfix">' +
										'<span class="iab_category tag">#{blogtitle}</span>' +
									'</div>' +
									'<div class="aq_sponsor">' +
										'<span>#{iab_category_list}</span>' +
										'<a href="#{link}" target="_blank" class="unit_url"><span class="glyphicon glyphicon-share"></span></a>' +
									'</div>' +
								'</div>',
			paginator 		: 	'<span class="page_number"><strong>#{from}</strong> - <strong>#{to}</strong><span class="est-total"> of #{is_approximate?about |}<strong>#{total}</strong></span></span>' +
								'<button class="paginator_button next glyphicon glyphicon-circle-arrow-right" #{prev_disabled?disabled|}</button>'+
								'<button class="paginator_button prev glyphicon glyphicon-circle-arrow-left" #{next_disabled?disabled|}</button>',
			tag 			: 	'<span>#{tag}</span>',
			advertiser_unit : 	'<div id="aid_#{id}" class="aq-advertiser #{blocked?advertiser-blocked|}">' +
									'<h1 class="advertiser-name"><span class="glyphicon glyphicon-user"></span>#{name}</h1>' +
									'<div class="advertiser-revenue">' +
										'<span class="num">$#{revenue}</span>' +
										'<span> in the last 7 days </span>' +
									'</div>' +
									'<a href="#" class="btn toggle-advertiser"><span class="glyphicon"></span> #{blocked?Unblock|Block} </a>' +
									'<a href="#" class="btn preview-advertiser"><span class="glyphicon glyphicon-eye-open"></span> Preview </a>' +
								'</div>',
			partner_unit 	: 	'<div id="pid_#{id}" class="aq-partner #{blocked?partner-blocked|}">' +
									'<h1 class="partner-name"><span class="glyphicon glyphicon-user"></span>#{name}</h1>' +
									'<a href="#" class="btn preview-partner"><span class="glyphicon glyphicon-eye-open"></span> Preview </a>' +
								'</div>'
		}
	};
})(jQuery);