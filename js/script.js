/*before-after*/
var slider = new BeerSlider( document.getElementById( "beer-slider"));
 /*preloder*/
window.onload = function () {
	document.body.classList.add('loaded_hiding');
	window.setTimeout(function () {
		document.body.classList.add('loaded');
		document.body.classList.remove('loaded_hiding');
	}, 500);
};
/*carousel*/
$('.carousel').carousel({
	interval: 0
});
/*galery*/
lightGallery(document.getElementById('aniimated-thumbnials'), {
	thumbnail:true
}); 
/*animated*/
(function($) {
	function doAnimations(elems) {
		var animEndEv = "webkitAnimationEnd animationend";
		elems.each(function() {
			var $this = $(this),
			$animationType = $this.data("animation");
			$this.addClass($animationType).one(animEndEv, function() {
				$this.removeClass($animationType);
			});
		});
	}

	var $myCarousel = $("#carouselExampleIndicators"),
	$firstAnimatingElems = $myCarousel
	.find(".carousel-item:first")
	.find("[data-animation ^= 'animated']");

	$myCarousel.carousel();

	doAnimations($firstAnimatingElems);

	$myCarousel.on("slide.bs.carousel", function(e) {
		var $animatingElems = $(e.relatedTarget).find(
			"[data-animation ^= 'animated']"
			);
		doAnimations($animatingElems);
	});
})(jQuery);