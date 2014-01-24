    </div><!-- #footer -->
		<?php do_action( 'bp_after_container' ) ?>
		<?php do_action( 'bp_before_footer' ) ?>

		<div id="footer">

      <?php wp_nav_menu(array(
              'theme_location' => 'footer',
              'container_class' => 'footer-menu',
              'fallback_cb' => 'false',
              'link_before'=>'<span>',
              'link_after' => '</span>',
            ));
      ?>

			<?php do_action( 'bp_footer' ) ?>


		<?php do_action( 'bp_after_footer' ) ?>

		<?php wp_footer(); ?>

</div> <!-- #content-sidebar-wrap -->

</div> <!-- #container -->
		
		
<script type="text/javascript">

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-8696297-4']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

</script>

<script type="text/javascript" src='/wp-content/themes/partners-main/js/bootstrap.js'></script>
<script type="text/javascript" src='/wp-content/themes/partners-main/nr-partners.js'></script>

	</body>

</html>