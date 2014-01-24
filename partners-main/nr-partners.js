// https://pdev.internal.nrelate.com/wp-content/themes/partners-main/ad-quality/lib/nr_aq.js

jQuery(function( $ ) {

	var nr_partners = {

		loadDomains : function() {
			$.ajax({
				type    : 'GET',
				url	    : 'https://pdev.internal.nrelate.com/wp-content/themes/partners-main/header_domains.php',
				success	: function( data ) {
					alert(data);
				},
				error 	: function(){
					alert('Communication error.');
				}
			});
		},

		processList : function() {

			// remove and insert
			var domainsList = $('#domains-list'),
				dropDownList = $('#dropdown-list'),
				pageNum,
				pagination = document.createElement('div');

			// pagination
			domainsList.children('li').each(function( index ) {
					
				pageNum = parseInt( ( index / 20 ) ) + 1;
				$( this ).addClass('page-domains page-' + pageNum);

				if ( pageNum === 1 ) 
					$( this ).addClass( 'page-current' );

				// console.log( index + ": " + $( this ).text() );
			});

			for ( var i = 1 ; i <= pageNum ; i++ ) {
				if ( i === 1 )
					pagination.innerHTML += '<a href="#' + i + '" class="paginator-current">' + i + '</a>';
				else
					pagination.innerHTML += '<a href="#' + i + '">' + i + '</a>';
			}

			pagination.setAttribute('class', 'pagination-div');

			domainsList.append( pagination );
			dropDownList.append( domainsList );

			// adding event listener to paginators
			$(' .pagination-div ').on('click', 'a', function() {
				$( '.page-domains' ).removeClass( 'page-current' );
				$( '.page-' + $( this ).text() ).addClass( 'page-current' );
				$( '.pagination-div > a' ).removeClass( 'paginator-current' );
				$( this ).addClass( 'paginator-current' );
			});
		},

		selectDomain : function() {
			$( '#dropdown-list li' ).on('click', 'a', function() {
				/* 
				 * update text for the display domain field
				 * start creating domain specific links for Reporting, Settings, and AQ
				 * toggle the dropdown menu (essentially hide it)
				 */
				$('#selected-domain').html( $( this ).text() + '<b class="caret"></b>');
				$('#dependent-settings').empty().append( $( this ).next().children() );
				$('#dropdown-list').toggle();
			})
		},

		toggleDomains : function() {
			$('#selected-domain').on('click', function() {
				$('#dropdown-list').toggle();
			})
		}
	};

	// nr_partners.loadDomains();
	nr_partners.processList();
	nr_partners.selectDomain();
	nr_partners.toggleDomains();

});


