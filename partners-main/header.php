<?php sfire_check_user_logged_in(); ?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" <?php language_attributes(); ?>>

<head profile="http://gmpg.org/xfn/11">
	<link rel="shortcut icon" href="http://partners.nrelate.com/wp-content/themes/partners-main/images/favicon.ico" />
	<meta http-equiv="Content-Type" content="<?php bloginfo('html_type'); ?>; charset=<?php bloginfo('charset'); ?>" />

	<title><?php bp_page_title() ?></title>

	<?php do_action( 'bp_head' ) ?>

	<!--link rel="stylesheet" href="<?php bloginfo('stylesheet_url'); ?>" type="text/css" media="screen" /-->
	<link rel="stylesheet" href="<?php bloginfo('stylesheet_directory'); ?>/print.css" type="text/css" media="print" />

	<?php if ( function_exists( 'bp_sitewide_activity_feed_link' ) ) : ?>
		<link rel="alternate" type="application/rss+xml" title="<?php bloginfo('name'); ?> | <?php _e('Site Wide Activity RSS Feed', 'buddypress' ) ?>" href="<?php bp_sitewide_activity_feed_link() ?>" />
	<?php endif; ?>

	<?php if ( function_exists( 'bp_member_activity_feed_link' ) && bp_is_member() ) : ?>
		<link rel="alternate" type="application/rss+xml" title="<?php bloginfo('name'); ?> | <?php bp_displayed_user_fullname() ?> | <?php _e( 'Activity RSS Feed', 'buddypress' ) ?>" href="<?php bp_member_activity_feed_link() ?>" />
	<?php endif; ?>

	<?php if ( function_exists( 'bp_group_activity_feed_link' ) && bp_is_group() ) : ?>
		<link rel="alternate" type="application/rss+xml" title="<?php bloginfo('name'); ?> | <?php bp_current_group_name() ?> | <?php _e( 'Group Activity RSS Feed', 'buddypress' ) ?>" href="<?php bp_group_activity_feed_link() ?>" />
	<?php endif; ?>

	<link rel="alternate" type="application/rss+xml" title="<?php bloginfo('name'); ?> <?php _e( 'Blog Posts RSS Feed', 'buddypress' ) ?>" href="<?php bloginfo('rss2_url'); ?>" />
	<link rel="alternate" type="application/atom+xml" title="<?php bloginfo('name'); ?> <?php _e( 'Blog Posts Atom Feed', 'buddypress' ) ?>" href="<?php bloginfo('atom_url'); ?>" />

	<link rel="pingback" href="<?php bloginfo('pingback_url'); ?>" />
	<link rel="stylesheet" type="text/css" href="/wp-content/themes/partners-main/css/nr-partners.css">
	<!-- Bootstrap -->
	<link rel="stylesheet" type="text/css" href="/wp-content/themes/partners-main/css/bootstrap.css">
	<link rel="stylesheet" type="text/css" href="/wp-content/themes/partners-main/css/bootstrap-theme.css">
		
	<?php wp_head(); ?>
</head>

<body <?php body_class() ?> id="bp-default">

	<?php do_action( 'bp_before_header' ) ?>
	<!-- located at wp-content/plugins/buddypress/bp-themes/bp-default/functions.php; body_class() is located in wp-includes/post-template.php. -->
	
	<div id="partners-header-wrapper" class="navbar-fixed-top box-shadow-dark">
		<div id="partners-header-inner" class="block-center clearfix">
			<a class="pull-left nav-logo-link" href="<?php echo site_url() ?>" title="<?php _e( 'Home', 'buddypress' ) ?>">
					<img src="http://css.nrcdn.com/images/nRelate-logo.png">
			</a>

			<div id='dependent-settings' class='pull-left partners-menu'>
			</div>

			<div class="pull-right partners-nav">
				<?php if ( is_user_logged_in() ) { ?>
					<div id="partners-domain" class="domain-selection-nav pull-left">
						<a href="#" id='selected-domain' class="dropdown-toggle">select a domain
							<b class="caret"></b>
						</a>
						<div id='dropdown-list' class="dropdown-menu">
							<!--ul id="dropdown-list">
								<li>
									<a href="">one of the domains</a>
								</li>
							</ul-->
						</div>
					</div><!-- end of domain selection -->
				<?php } ?>
				
				<?php if ( is_user_logged_in() ) { ?>
					<div id="nr-header-me" class="pull-left">
						<!--a href="<?php echo bp_loggedin_user_domain() ?>">
							<?php bp_loggedin_user_avatar( 'type=thumb&width=40&height=40' ) ?>
						</a-->

						<span class="user-name"><?php echo bp_core_get_userlink( bp_loggedin_user_id() ); ?></span>
						<a class="button logout" href="<?php echo wp_logout_url( bp_get_root_domain() ) ?>"><?php _e( 'Log Out', 'buddypress' ) ?></a>
					</div>
				<?php } ?>

			</div><!-- #navigation -->

			<?php do_action( 'bp_header' ) ?>
		</div>

		<?php
			if ( is_user_logged_in() ) {
				wp_nav_menu(array(
					'theme_location' => 'logged-in-nav',
					'container_class' => 'universal-settings',
					'fallback_cb' => 'false',
					// 'link_before'=>'<span>',
					// 'link_after' => '</span>',
					'menu_class' => 'block-center clearfix'
				));
			} else {
				wp_nav_menu(array( 
					'theme_location' => 'logged-out-nav',
					'container_class' => 'menu',
					'fallback_cb' => 'false',
					// 'link_before'=>'<span>',
					// 'link_after' => '</span>',
					'menu_class' => 'nav nav-pills'
				));
			}
		?>

	</div><!-- end of header wrapper -->

	<?php do_action( 'bp_after_header' ) ?>
	<?php do_action( 'bp_before_container' ) ?>

	<div id="partners-content-wrapper">
		<div id="partners-content-inner" class="block-center clearfix">

