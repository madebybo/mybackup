jQuery(function( $ ) {

	window.nr_aq = {
		
		/*
		* Init widget
		*/
		init : function( options ){

			if ( !options.domainid ) {
				$.error("Need a domainid");
				return false;
			}

			// merging _defaults, _settings, and the passed option parameter all to this.option
			$.extend( this.options, this._defaults, options, this._settings );

			// Detect browser
			var userAgent = navigator.userAgent.toLowerCase();
			this.options.browser = {
				version: (userAgent.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/) || [])[1],
				safari: /webkit/.test(userAgent),
				opera: /opera/.test(userAgent),
				msie: (/msie/.test(userAgent)) && (!/opera/.test(userAgent)),
				mozilla: (/mozilla/.test(userAgent)) && (!/(compatible|webkit)/.test(userAgent))
			};

			// Initialize UI elements
			this.ui.units_display 	= $( this.options.units_display_selector );
			this.ui.current_rpm 	= $( this.options.current_rpm_selector );
			this.ui.projected_rpm 	= $( this.options.projected_rpm_selector );
			this.ui.rpm_difference 	= $( this.options.rpm_difference_selector );
			this.ui.slider_text   	= $( this.options.slider_text_selector );
			this.ui.slider_panel   	= $( this.options.slider_panel_selector );
			this.ui.tags_text       = $( this.options.tags_text_selector );
			this.ui.tags_panel   	= $( this.options.tags_panel_selector );
			this.ui.paginator   	= $( this.options.paginator_selector );
			this.ui.aq_tags_filters = $( this.options.aq_tags_filters_selector );


			// "this" is a native object, $(this) is a jQuery object
			$(this).on("slider_changed", this.filter_units );

			this.load_data();
			this.setup_tags_filter();
			this.setup_slider();
			this.enable_block();
			this.switch_tabs();

			nr_aq.initialized = true;

			// Warn the user if leaving and there are unsaved changes
			var self = this;
			$(window).on("beforeunload", function(){
				if ( self._dirty == true ) {
					return "Your changes will be lost";
				}
			});
		},



		/**
		* Make API::load() call
		*/
		load_data : function( manual_offset ) {

			var self = this;

			// Ignore if all units were already loaded, and cancel loading gif
			if ( self._units.total_count !== null && self._units.total_count <= self._units.all.length ) {
				self.all_loaded = true;
				$( '#units_loading' ).hide();
				return false;
			}

			// Force the offset to load a new page
			this.options.offset++;

			// Show only the non-blocked units by default
			nr_aq.options.show_block_status = false;

			// abort all previous requests before making a new one
			self.abortAll();
			
			$.ajax({
				beforeSend: function( jqXHR ) {

					console.log('load ads initialized? ' + self.initialized);

					if ( self.initialized )
						self.xhrPool.push( jqXHR );
				},
				url  	: this.options.load_api_url,
				data 	: {
					domainid : this.options.domainid,
					numUnits : this.options.numUnits,
					offset	 : ( manual_offset || this.options.offset ) * this.options.numUnits 	// Allow manual override
				},
				dataType: "json",
				success	: function( data ) {
					var i, j, 
						start_index = self._units.all.length;

					for( i=0, j=data.units.length; i < j; i++ ) {
						// Add index and selector properties to units, append them to the _units.all array
						data.units[i]._index = i + start_index;
						data.units[i].tags_list = function( data ) { return self._tags_list( data ) };
						data.units[i]._selector = self.tmpl( self._tmpl.unit_selector, data.units[i] );
						self._units.all[ data.units[i]._index ] = data.units[i];
					}

					// Update the global counts
					self._units.total_count = data.total_count;
					self._units.total_bl_count = data.total_bl_count;

					self.debug( "%d units cached of %d", self._units.all.length, self._units.total_count );

					// remove this request from the queue if it's completed (not 'pending')
					self.xhrPool.pop();
					console.log('poped load request');

					// Update the UI
					$(self).trigger("slider_changed");
				},
				error	: function( jqXHR ){
					//If either of these are true, then it's not a true error and we don't care
				    if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

					console.log( "LOADING REQUEST COMM ERROR" );
				}
			});
		},



		/**
		* setup_tags_filter
		*/
		setup_tags_filter : function() {
			var self = this;
		
			this.ui.aq_tags_filters
			.each( function(){
				if ( $.inArray( $(this).text(), self.options.tags_blacklist ) < 0 ) {
					$(this).addClass('whitelisted');
					self.options.tags_whitelist.push( $(this).text() );
				}
			})
			.on( 'click', function(){

				self.options.tags_blacklist = [];
				self.options.tags_whitelist = [];

				$(this).toggleClass('whitelisted');

				self.ui.aq_tags_filters.filter(':not(.whitelisted)').each(function(){
					self.options.tags_blacklist.push( $(this).text() );
				});

				self.ui.aq_tags_filters.filter('.whitelisted').each(function(){
					self.options.tags_whitelist.push( $(this).text() );
				});

				$(nr_aq).trigger("slider_changed");

				console.log('blacklist: ' + self.options.tags_blacklist);
				console.log('whitelist: ' + self.options.tags_whitelist);

				return false;
			});

			self.ui.tags_text.text( self.options.tags_whitelist.length > 0 ? self.options.tags_whitelist.join(', ') : 'No tag');

		},


		/**
		* Sets up and handle slider changes
		*/
		setup_slider : function() {
			var self = this;

			this.ui.slider = $( this.options.slider_selector ).slider({
				range : true,
				min: 0,
				max: 100,
				values: [ Math.max( 0, this.options.minValue ), Math.min( this.options.maxValue, 100 ) ],
				slide : function( event, ui ){

					// Control if values are changed
					if ( self.options.minValue != self.ui.slider.slider("values")[0] || self.options.maxValue != self.ui.slider.slider("values")[1] ) {
						self._dirty = true;
					}

					// make use of native ui para to get the precise maturity value
					if (ui) {
						self.options.minValue = ui.values[0];
						self.options.maxValue = ui.values[1];
					} else {
						self.options.minValue = self.ui.slider.slider("values")[0];
						self.options.maxValue = self.ui.slider.slider("values")[1];
					}

					// Update the UI
					self.ui.slider_text.val( self.options.minValue + " - " + self.options.maxValue );
					
				},
				change: function() {

					// abort all previous requests before making a new one
					// self.abortAll();

					// When slider change is finished, make API call to update RPM
					$.ajax({
						beforeSend: function( jqXHR ) {

							console.log('update RPM initialized? ' + self.initialized);

							if ( self.initialized )
								self.xhrPool.push( jqXHR );
						},
						url		: self.options.rpm_api_url,
						data 	: {
							domainid : self.options.domainid,
							minValue : self.options.minValue,
							maxValue : self.options.maxValue
						},
						dataType: "json",
						success	: function( data ) {
							self.update_projected_rpm( data );
						},
						error	: function( jqXHR ){
							//If either of these are true, then it's not a true error and we don't care
						    if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

							console.log( "RPM REQUEST COMM ERROR" );
						},
						complete: function( jqXHR ) {

							console.log('RPM call complete ');
							// Force paginator to first page and update the pages
					self._paginator.page = 0;
					self.xhrPool.pop();
					$(self).trigger("slider_changed");

						},
					});

					
				}
			});

			// Initialize the UI
			this.ui.slider.slider("option", "change").call( this.ui.slider );
			this.ui.slider.slider("option", "slide").call( this.ui.slider );
		},



		/**
		* Updates the RPM UI, calculates the difference between real and projected
		*/
		update_projected_rpm : function( data ) {
			var diff = Math.round( (data.projected_rpm - data.real_rpm) * 100 ) / 100;

			this.ui.current_rpm.html( this.options.currency + data.real_rpm.toFixed(2) );
			this.ui.projected_rpm.html( this.options.currency + data.projected_rpm.toFixed(2) );

			// handling the difference is 0 situation
			if(diff === 0){
				this.ui.rpm_difference
					.find( 'img' ).hide().end()
					.find( '.metric_number' ).html( this.options.currency + Math.abs(diff).toFixed(2) ).css( "color", "white" );
			} else {
				this.ui.rpm_difference
					.find( 'img' ).show().attr( 'src', ( diff > 0 ? this.options.arrow_up_url : this.options.arrow_down_url ) ).end()
					.find( '.metric_number' ).html( this.options.currency + Math.abs(diff).toFixed(2) ).css( "color", diff >= 0 ? "green" : "red" );
			}
		},



		/**
		* Filter all the units to initialize the active ones, accordint to slider, tag, and tab settings
		*/
		filter_units : function(){

			var i, j, has_bl_tag, self = this;

			// Ignore if there are no units
			if ( this._units.all.length == 0 ) return false;

			// Populate the active units array with the ones that match the user settings
			this._units.active = [];
			for( i=0, j = this._units.all.length; i < j; i++ ) {

				// Filter by slider settigs
				if ( this._units.all[i].img_maturity_level >= this.options.minValue && this._units.all[i].img_maturity_level <= this.options.maxValue ) {

					has_bl_tag = $.map( this.options.tags_blacklist, function(a){ return $.inArray( a, self._units.all[i].quality_tags ) < 0 ? null : a; } ).length > 0;

					// If in blacklist, no unit is allowed no matter which tab
					if( has_bl_tag) continue;

					// Filter by tab
					else if ( typeof this.options.show_block_status != 'undefined' ) {
						if ( this.options.show_block_status ) {
							if ( !this._units.all[i].blocked ) continue;
						} else {
							if ( this._units.all[i].blocked ) continue;
						}
					}

					this._units.active.push( i );
				}
			}

			if ( this._units.active.length >= this.options.per_page ) {
				$( '#units_loading' ).hide();
			}

			if ( this._units.active.length === 0 && this.all_loaded ) {

				// if it's on BLOCKED tab, the RPM could be either 0 or other number
				if ( this.options.show_block_status ) {
					// no tags selected, RPM should be 0 even in the blocked tab
					if ( this.options.tags_whitelist.length === 0 ) $( '.revenue_module_unit' ).addClass( 'no_rpms' );
					// if there are tags selected, RPM should remain
					if ( this.options.tags_whitelist.length !== 0 ) $( '.revenue_module_unit' ).removeClass( 'no_rpms' );
				}
				
				// if no units are visible in the DOM visually, hide pagination anyway
				$( '#no_units_to_show' ).show();
				$( '.paginator_container' ).css('visibility', 'hidden');
			} else {

				// things are much easier when there are units to show, keep both RPMs and pagination
				$( '.revenue_module_unit' ).removeClass( 'no_rpms' );
				$( '#no_units_to_show' ).hide();
				$( '.paginator_container' ).css('visibility', 'visible');
			}

			// Update the page HTML
			this.paginate_units();
		},



		/**
		* Controls the units pagination
		*/
		paginate_units: function( active_indexes, page, more_callback ) {

			console.log('paginate units function called');

			var i, j, insert_index, tmp, page_indexes, indexes_to_add, is_approximate, est_total,
				self 					= this,
				more_callback			= more_callback || this.load_data,									// Function to call if we run out of units
				active_indexes			= active_indexes || this._units.active.slice(0),					// Current active units according to slider and tabs settings
				children				= this.ui.units_display.find( this.options.units_selector ),		// Current units being shown in the HTML
				current_indexes 		= children.map(function(){ return $(this).data("index"); }).get();	// Indexes og the units being shown in the HTML


			this._paginator.page 	= Math.min( Math.max( typeof page != 'undefined' ? page : this._paginator.page, 0 ), Math.ceil( this._units.total_count / this.options.per_page ) - 1 ),								// Current page
			page_indexes			= active_indexes.slice(0).splice( this._paginator.page * this.options.per_page, this.options.per_page ),// Indexes to show in the current page
			indexes_to_add			= $( page_indexes ).not( current_indexes ).get();														// Indexes that need to be injected to the HTML, not currently being shown


			if ( !(this.options.show_block_status === true && active_indexes.length >= this._units.total_bl_count) ) { // Ignore if showing only blocked and there are no more blocked according to API

				if ( ( page_indexes.length < this.options.per_page || ( (this._paginator.page * this.options.per_page) + this.options.per_page) >= active_indexes.length ) && $.isFunction( more_callback ) ) {

					/* 
					* keep loading more units only when there are no other pending requests AND the user didn't hit SAVE
					*/

					console.log( 'within paginate units ' + this.xhrPool.length );

					if ( this.xhrPool.length === 0 && !this.hit_save )  {

						console.log("Not enough units for this page, trying to load more");
						more_callback.call( this );
					}
				}			
			}		

			// Hide the units that are currently in the HTML but shouldn't be
			for( i=0, j=children.length; i < j; i++ ) {
				if ( $.inArray( $( children[i] ).data('index'), page_indexes ) == -1 ) {
					$( children[i] ).hide(200, function(){ $(this).remove(); });
				}
			}

			// Add the new units to the current page HTML
			for( i=0, j=indexes_to_add.length; i < j; i++ ) {
				insert_index = $.inArray( indexes_to_add[i], page_indexes );

				tmp = $( this.tmpl( this._tmpl.solr_unit, this._units.all[ indexes_to_add[i] ] ) );
				tmp.hide();

				if ( insert_index == 0 ) {
					// Insert in the first position
					this.ui.units_display.prepend( tmp );
				} else {
					// Insert in any other position
					$( this.ui.units_display.children( this.options.units_selector )[ insert_index - 1 ] ).after( tmp );
				}

				// Animate the newly inserted unit
				tmp.delay(200).fadeIn(200);
			}

			is_approximate = more_callback && this._units.all.length != this._units.total_count;

			est_total = ( is_approximate ? Math.ceil( this._units.active.length / this._units.all.length * this._units.total_count ) : this._units.active.length );

			// Update the paginator status HTML template
			this.ui.paginator.html( this.tmpl( this._tmpl.paginator, {
				from			: ( this._paginator.page * this.options.per_page ) + 1,
				to 				: ( this._paginator.page * this.options.per_page ) + Math.min( this.options.per_page, page_indexes.length ),
				total 			: est_total,
				is_approximate 	: is_approximate,
				prev_disabled	: this._paginator.page == 0,
				next_disabled	: ( ( this._paginator.page * this.options.per_page ) + page_indexes.length ) >= this._units.active.length
			}));

			// Handle the pagination button clicks
			this.ui.paginator.find('button:enabled').click(function(){
				var btn = $(this),
					direction = btn.is(".next") ? 1 : -1;
				
				self.paginate_units( active_indexes, self._paginator.page + direction );

				return false;
			});
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
		* Handles overlay clicks to bloc/unblock units
		*/
		enable_block: function(){
			var self = this;

			this.ui.units_display.on("click", ".overlay", function(){
				var overlay = $(this);
				var ad = overlay.closest( self.options.units_selector );

				if ( ad.is(".blocked") ) {
					ad.removeClass('blocked').find('.overlay span').html( 'CLICK TO BLOCK' );
					self._units.all[ ad.data("index") ].blocked = 0;
					self._whitelist( self._units.all[ ad.data("index") ].OPEDID );
				} else {
					ad.addClass('blocked').find('.overlay span').html( 'CLICK TO UNBLOCK' );
					self._units.all[ ad.data("index") ].blocked = 1;
					self._blacklist( self._units.all[ ad.data("index") ].OPEDID );
				}

				self._dirty = true;

				// Update the paginated units
				$(self).trigger("slider_changed");
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


		_tags_list : function( data ) {
			var i, result = '&#10003;';

			if ( typeof data.quality_tags != 'undefined' && data.quality_tags != null && data.quality_tags.length ) {

				for( i in data.quality_tags ) {
					result += this.tmpl( this._tmpl.quality_tag, { tag: data.quality_tags[i] } );
				}
			}

			return result;
		},



		/**
		* Controls tabs interactions
		*/
		switch_tabs : function(){
			var self = this;

		  	// change tab
			$('#units_display_tab .tab, #settings_save .btn').on( "click", function(){
				var tab = $(this);

				switch( tab.attr("id") ) {
					case "tab_active":
						// Show only the non-blocked units
						nr_aq.options.show_block_status = false;
					break;
					case "tab_blocked":
						// Show only blocked units
						nr_aq.options.show_block_status = true;
					break;
					case "tab_save":
						
						// abort all previous requests before making a new one
						self.abortAll();
						self.hit_save = true;
						
						// Send save request					
						$.ajax({
							beforeSend: function( jqXHR ) {

								console.log('hit save initialized? ' + self.initialized);

								if ( self.initialized ) 
									self.xhrPool.push( jqXHR );
							},
							type 	: "POST",
							url		: self.options.save_api_url,
							data 	: {
								domainid 		: self.options.domainid,
								imgMaturityMin 	: self.options.minValue,
								imgMaturityMax 	: self.options.maxValue,
								taglist_bl		: self.options.tags_blacklist,
								blacklist 		: self._units.blacklist,
								whitelist 		: self._units.whitelist
							},
							dataType: "json",
							success	: function( data ) {
								// Refresh the document to load the saved data
								self._dirty = false;
								// remove this request from the queue if it's completed (not 'pending')
								self.xhrPool.pop();

								alert("Your changes have been saved");
								window.location.reload();
							},
							error	: function( jqXHR ){
								//If either of these are true, then it's not a true error and we don't care
							    if (jqXHR.status === 0 || jqXHR.readyState === 0) return;

								console.log( "SAVING REQUEST COMM ERROR" );
							}
						});

						return true;
					break;
				}

				tab.addClass("selected").siblings().removeClass("selected");
				nr_aq._paginator.page = 0;
				$(nr_aq).trigger("slider_changed");
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
		ui : {
			slider 			: null,
			slider_text		: null,
			current_rpm 	: null,
			projected_rpm 	: null,
			rpm_difference	: null,
			units_display 	: null,
			paginator 		: null
		},




		/*
		* Properties
		*/
		options : {},




		/*
		* array of uncompleted requests
		*/
		xhrPool : [],




		/*
		* if the page has been initialized
		*/
		initialized : false,




		/*
		* if all units are loaded
		*/
		all_loaded : false,




		/*
		* if the use has hit save
		*/
		hit_save : false,

		


		/**
		* Default settings, can be overriden with init options
		*/
		_defaults : {
			domainid 		: null,
			rpm  			: null,
			minValue 		: 0,
			maxValue		: 100,
			tags_blacklist 	: [],
			tags_whitelist  : [],
			numUnits		: 100,
			per_page		: 12,
			offset			: -1,
			currency		: "$",
			debug_mode 		: /.*\?.*nrelate_debug=.*/.test( window.location ) || Boolean( window['nr_debug'] )
		},



		/**
		* Indicates if there are changes pending to be saved
		*/
		_dirty : false,



		/**
		* Constant settings (cannot be overriden by the user)
		*/
		_settings : {
			slider_selector 		: "#slider-range",
			slider_text_selector	: "#amount",
			slider_panel_selector   : "#slider_panel_id",
			tags_text_selector      : "#tags_selected",
			tags_panel_selector     : "#tags_panel_id",
			current_rpm_selector	: "#current_rpm .metric_number",
			projected_rpm_selector	: "#projected_rpm .metric_number",
			rpm_difference_selector	: "#arrow_indicator",
			units_display_selector	: "#units_display",
			units_selector 			: ".aq_unit",
			paginator_selector 		: ".paginator_container",
			aq_tags_filters_selector: ".aq_tags_option",
			arrow_down_url			: "http://css.nrcdn.com/images/Red_Arrow_Down.png",
			arrow_up_url			: "http://css.nrcdn.com/images/Green_Arrow_Up.png",
			load_api_url			: "https://pdev.internal.nrelate.com/wp-content/themes/partners-main/ad-quality/api/load.php",
			rpm_api_url				: "https://pdev.internal.nrelate.com/wp-content/themes/partners-main/ad-quality/api/rpm.php",
			save_api_url			: "https://pdev.internal.nrelate.com/wp-content/themes/partners-main/ad-quality/api/save.php"
		},




		/**
		* Global 
		*/
		_units : {
			all 			: [],	// all units downloaded with API::load()
			active			: [],	// active units according to slider and tabs settings
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
			solr_unit		: 	'<div class="aq_unit#{blocked? blocked|}" id="unit_#{OPEDID}" data-index="#{_index}">' + 
									'<div class="overlay"><span>CLICK TO #{blocked?UNBLOCK|BLOCK}</span></div>' +
									'<div class="aq_image">' +
										'<img src="#{media}" />' +
									'</div>' +
									'<div class="aq_text">' +
										'<p class="post_title">#{title}</p>' +
										'<!--p class="aq_tags">#{tags_list}</p>' +
										'<div class="txt_maturity_level">#{img_maturity_level}</div-->' +
									'</div>' +
									'<div class="aq_filter clearfix">' +
										'<span class="maturity">#{img_maturity_level}</span>' +
										'<span class="tag">#{tags_list}</span>' +
									'</div>' +
									'<div class="aq_sponsor">' +
										'<span>#{blogtitle}</span>' +
										'<a href="#{link}" target="_blank" class="unit_url"><span class="glyphicon glyphicon-share"></span></a>' +
									'</div>' +
								'</div>',
			paginator 		: 	'<span class="page_number"><strong>#{from}</strong>-<strong>#{to}</strong> of #{is_approximate?about |}<strong>#{total}</strong></span>' +
								'<button class="paginator_button next glyphicon glyphicon-circle-arrow-right" #{prev_disabled?disabled|}</button>'+
								'<button class="paginator_button prev glyphicon glyphicon-circle-arrow-left" #{next_disabled?disabled|}</button>',
			quality_tag 	: 	'<span>#{tag}</span>'
		}
	};

	// dynamically set certain div width
  	// adjustWidth();
  	// $(window).bind('resize', adjustWidth);

});

function adjustWidth() {
  var width = $(window).width(),
      slider_div = parseInt(width - 230) + 'px',
      units_display_div = parseInt(width - 200) + 'px',
      slider_range = parseInt(width - 230 - 250 - 35) + 'px';

  $("#aq_header").css('padding-left',parseInt((width - 985)/2) + 'px');
  $("#aq_header").css('padding-right',parseInt((width - 985)/2) + 'px');
}