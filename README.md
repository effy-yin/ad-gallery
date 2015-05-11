# ad-gallery

from http://adgallery.codeplex.com/

A highly customizable gallery/showcase plugin for jQuery.

- Choose effect, should the image slide in, or fade in? You can even write your own animation function.
- Show fifth image by adding #ad-image4 to the url, this takes precedence over over settings.start_at_index
- Create permalinks to specific images, by index or id
- Listens to changes to the url to make linking to specific images easier
- jQuery call returns gallery instances, which enables you to change settings on the fly like the "Change to fade effect" link above
- Keyboard arrows to move back and forth
- Click on the edge of the big image to go to the next/previous
- Images are preloaded, and if they aren't finished loading when they are supposed to be displayed, a loading image will appear
- Slideshow count down only begins when the image has loaded and is visible
- Image title, can either be set in the title attribute, or in elm.data('ad-title', 'My title here'). $.data takes precedence over the title attribute
- Image descriptions, can either be set in the longdesc attribute, or in elm.data('ad-desc', 'My description here'). $.data takes precedence over the longdesc attribute
- Callbacks on different events that has access to the internal object, which means that you can access all internal methods, etc
- Takes the dimensions of the image container div and scales down images that are larger than it
- Image is positioned in the middle if it's smaller than the container div
- Images that are larger than the container are scaled down to fit inside the container

## options
```javascript
var galleries = $('.ad-gallery').adGallery({
  loader_image: 'loader.gif',
  // Width of the image, set to false and it will 
  // read the CSS width
  width: 600, 
  // Height of the image, set to false and it 
  // will read the CSS height
  height: 400, 
  // Opacity that the thumbs fades to/from, (1 removes fade effect)
  // Note that this effect combined with other effects might be 
  // resource intensive and make animations lag
  thumb_opacity: 0.7,
  // Which image should be displayed at first? 0 is the first image  
  start_at_index: 0, 
  // Whether or not the url hash should be updated to the current image
  update_window_hash: true, 
  // Either false or a jQuery object, if you want the image descriptions
  // to be placed somewhere else than on top of the image
  description_wrapper: $('#descriptions'), 
  // Should first image just be displayed, or animated in?
  animate_first_image: false,
  // Which ever effect is used to switch images, how long should it take?  
  animation_speed: 400, 
  // Can you navigate by clicking on the left/right on the image?
  display_next_and_prev: true, 
  // Are you allowed to scroll the thumb list?
  display_back_and_forward: true, 
  // If 0, it jumps the width of the container
  scroll_jump: 0, 
  // 用来设置开始和暂停功能
  slideshow: {
    enable: true,
    autostart: true,
    speed: 5000,
    start_label: 'Start',
    stop_label: 'Stop',
    // Should the slideshow stop if the user scrolls the thumb list?
    stop_on_scroll: true, 
    // Wrap around the countdown
    countdown_prefix: '(', 
    countdown_sufix: ')',
    onStart: function() {
      // Do something wild when the slideshow starts
    },
    onStop: function() {
      // Do something wild when the slideshow stops
    }
  },
  // or 'slide-vert', 'resize', 'fade', 'none' or false
  effect: 'slide-hori', 
  // Move to next/previous image with keyboard arrows?
  slide: true, 
  // If set to false, you can't go from the last image to the first, and vice versa
  cycle: true, 
  // All hooks has the AdGallery objects as 'this' reference
  hooks: {
    // If you don't want AD Gallery to handle how the description
    // should be displayed, add your own hook. The passed image
    // image object contains all you need
    displayDescription: function(image) {
      alert(image.title +" - "+ image.desc);
    }
  },
  // All callbacks has the AdGallery objects as 'this' reference
  callbacks: {
    // Executes right after the internal init, can be used to choose which images
    // you want to preload
    init: function() {
      // preloadAll uses recursion to preload each image right after one another
      this.preloadAll();
      // Or, just preload the first three
      this.preloadImage(0);
      this.preloadImage(1);
      this.preloadImage(2);
    },
    // This gets fired right after the new_image is fully visible
    afterImageVisible: function() {
      // For example, preload the next image
      var context = this;
      this.loading(true);
      this.preloadImage(this.current_index + 1,
        function() {
          // This function gets executed after the image has been loaded
          context.loading(false);
        }
      );

      // Want slide effect for every other image?
      if(this.current_index % 2 == 0) {
        this.settings.effect = 'slide-hori';
      } else {
        this.settings.effect = 'fade';
      }
    },
    // This gets fired right before old_image is about to go away, and new_image
    // is about to come in
    beforeImageVisible: function(new_image, old_image) {
      // Do something wild!
    }
  }
});

// Set image description
some_img.data('ad-desc', 'This is my description!');

// Change effect on the fly
galleries[0].settings.effect = 'fade';
```
## HTML
```html
<div class="ad-gallery">
  <div class="ad-image-wrapper"></div>
  <div class="ad-controls"></div>
  <div class="ad-nav">
    <div class="ad-thumbs">
      <ul class="ad-thumb-list">
        <li>
          <a href="images/1.jpg">
            <img src="images/thumbs/t1.jpg" title="Title for 1.jpg">
          </a>
        </li>
        <li>
          <a href="images/2.jpg">
            <img src="images/thumbs/t2.jpg" longdesc="http://www.example.com" alt="Description of the image 2.jpg">
          </a>
        </li>
      </ul>
    </div>
  </div>
</div>
```
## Linking
You can link to images, either by image index or by id. The syntax for linking to the fourth image is:

```html
<a href="#ad-image-3">Fourth image</a>
```
AD Gallery listens to changes in the url, so you can have internal links on the gallery page to different images. If you don't wish to link by image index, you can give the anchor element in ad-thumb-list an id, and use the id in the link instead, like this:
```html
<ul class="ad-thumb-list">
  <li>
    <a href="images/1.jpg" id="myimageid">
      <img src="images/thumbs/t1.jpg" class="image0">
    </a>
  </li>
</ul>

<a href="#ad-image-myimageid">Click me!</a
```
The url hash is by default updated to the current image, which means that if you reload the page, you see the same image as before the refresh. This can be disabled by passing the update_window_hash setting, like this:

```javascript
var galleries = $('.ad-gallery').adGallery({update_window_hash: false});
```

If you have multiple galleries on the same page, you probably want to disable this, unless you have ids on all anchor elements.

Customize
You can alter the way it looks by editing the CSS file, or overriding the default CSS rules.
Image sizes
You probably want some other image size than the one in the demo above, and the only thing you need to do for this is to add this pice of CSS.

```css
.ad-gallery {
  width: YOUR-IMAGE-WIDTHpx;
}
.ad-gallery .ad-image-wrapper {
  height: YOUR-IMAGE-HEIGHTpx;
}
```


Or you can specify it in the settings.width and settings.height. If you do that though, the gallery might flicker on page load, since it might take a while before that code runs, so I would suggest that you set it with CSS. If you want bigger thumbnails, the height of the thumb list adjusts itself to that, but you might want to position the arrows next to the list of your thumbs. You do that by adding this CSS and modifying to fit your needs.

```css
.ad-gallery .ad-back {
  left: -20px;
  width: 13px;
  background: url(your_back_button.png) no-repeat;
}
.ad-gallery .ad-forward {
  right: -20px;
  width: 13px;
  background: url(your_forward_button.png) no-repeat;
}
```

Image descriptions
It's now possible (since 1.2.3) to have the image description somewhere else than on top of the big image. To to this, supply the description_wrapper config parameter, which should be a jQuery object, such as $('#descriptions'). Note that the old description isn't removed until the old image is removed. This to enable you to animate the descriptions. If you don't need it, just add:

```javascript
if (this.current_description) this.current_description.remove();
```


in the animations that you use.

If that isn't enough for you, and you need complete control over how to display or deal with descriptions, you can add your own hook for that, something like this:

```javascript
var galleries = $('.ad-gallery').adGallery({
  hooks: {
    displayDescription: function(image) {
      console.log(image);
    }
  }
});
```

The passed image object contains all you need, and `this` inside the function points to the internal AD Gallery object. 

## Animations
You can now add your own animation, by doing something like this.

```javascript
// The first argument is the name of your animation, which you then set in
// galleries[0].settings.effect
// The second argument is the function that handles the animation and it takes
// three arguments. The first is a jQuery object to the div that holds the image
// element and the image description element of the image that should be displayed
// The second is the direction, either 'left' or 'right'
// The third is the jQuery object that holds the description
// Your function should return an object like this:
// {old_image: {}, new_image: {}, speed: 100, easing: 'swing'}
// 'speed' and 'easing' are optional
// 'old_image' and 'new_image' are sent to the jQuery animate-method
// so use it just like you would use the $.animate-method
// This function gets executed with the gallery instance as its context
// so 'this' points to the gallery instance
galleries[0].addAnimation('wild',
  function(img_container, direction, desc) {
    var current_left = parseInt(img_container.css('left'), 10);
    var current_top = parseInt(img_container.css('top'), 10);
    if(direction == 'left') {
      var old_image_left = '-'+ this.image_wrapper_width +'px';
      img_container.css('left',this.image_wrapper_width +'px');
      var old_image_top = '-'+ this.image_wrapper_height +'px';
      img_container.css('top', this.image_wrapper_height +'px');
    } else {
      var old_image_left = this.image_wrapper_width +'px';
      img_container.css('left','-'+ this.image_wrapper_width +'px');
      var old_image_top = this.image_wrapper_height +'px';
      img_container.css('top', '-'+ this.image_wrapper_height +'px');
    };
    if(desc) {
      desc.css('bottom', '-'+ desc[0].offsetHeight +'px');
      desc.animate({bottom: 0}, this.settings.animation_speed * 2);
    };
    if(this.current_description) {
      this.current_description.css('bottom', '-'+ this.current_description[0].offsetHeight +'px');
    };
    img_container.css('opacity', 0);
    return {old_image: {left: old_image_left, top: old_image_top, opacity: 0},
            new_image: {left: current_left, top: current_top, opacity: 1},
            easing: 'easeInBounce',
            speed: 2500};
  }
);
galleries[0].settings.effect = 'wild';
```

Integrate with Fancybox
As reported by jasminj, you can integrate AD Gallery with Fancybox to open the main image in Fancybox when you click on it. Here's some example code:

```javascript
$(".ad-gallery").on("click", ".ad-image", function() {
  $.fancybox.open({
    href : $(this).find("img").attr("src"),
    closeBtn: false,
    closeClick : true,
    openEffect : 'elastic',
    openSpeed  : 150,
    closeEffect : 'elastic',
    closeSpeed  : 150,
    helpers : {
      overlay : null
    }
  });
});
```


Be sure to add this piece of CSS as well to make the image seem clickable:

```css
.ad-image {
  cursor: pointer;
}
```
