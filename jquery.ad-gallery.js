(function($) {
    function AdGallery(wrapper, options) {
        var defaults = { 
            loader_image: '../image/loader.gif',
            width: false,                   // image_wrapper 的宽度
            height: false,                  // image_wrapper 的高度
            display_next_and_prev: true,
            display_back_and_forward: true,
            enable_keyboard_move: true,
            description_wrapper: false,     // 图片描述显示的位置
            start_at_index: 0,
            update_window_hash: true,  
            animate_first_image: false,                 
            thumb_opacity: 0.7,            
            animation_speed: 400,
            effect: 'slide-hori',           // or 'slide-vert', 'fade', or 'resize', 'none'
            scroll_jump: 0,                 // If 0, it jumps the width of the container 每次点击缩略图back/forward按钮时scrollLeft的长度
            cycle: true,
            slideshow: {
                enable: true,
                autostart: false,
                stop_on_scroll: true,
                speed: 5000,
                start_label: 'Start',
                stop_label: 'Stop',                
                countdown_prefix: '(',
                countdown_sufix: ')',
                onStart: false,             
                onStop: false
            },
            hooks: {
                displayDescription: false   // 显示图片描述时的钩子函数
            },
            callbacks: {                    // 事件发生时的回调函数
                init: false,
                afterImageVisible: false,
                beforeImageVisible: false
            }
        };
        var settings = $.extend(false, defaults, options);
        if (options && options.slideshow) {
            settings.slideshow = $.extend(false, defaults.slideshow, options.slideshow);
        }
        if (!settings.slideshow.enable) {
            settings.slideshow.autostart = false;
        }

        this.init(wrapper, settings);
    }

    AdGallery.prototype = {
        wrapper: false,
        image_wrapper: false,       // vs. img_container
        image_wrapper_width: 0,
        image_wrapper_height: 0,        
        nav: false,
        nav_display_width: 0,
        thumbs_wrapper: false,
        thumbs_wrapper_width: 0,

        prev_link: false,
        next_link: false,        
        scroll_back: false,
        scroll_forward: false,
        gallery_info: false,
        loader: false,        
        preloads: false,

        slideshow: false,

        settings: false,
        images: false,        

        current_index: -1,
        current_image: false,
        current_description: false,
        in_transition: false,
        animations: false,

        init: function(wrapper, settings) {
            var context = this;
            this.wrapper = $(wrapper);
            this.settings = settings;
            this.setupElements();
            this.setupAnimations();
            if (this.settings.width) {
                this.image_wrapper_width = this.settings.width;
                this.image_wrapper.width(this.settings.width);
                this.wrapper.width(this.settings.width);
            } else {
                this.image_wrapper_width = this.image_wrapper.width();
            }
            if (this.settings.height) {
                this.image_wrapper_height = this.settings.height;
                this.image_wrapper.height(this.settings.height);
            } else {
                this.image_wrapper_height = this.image_wrapper.height();
            }
            this.nav_display_width = this.nav.width();
            this.current_index = -1;
            this.current_image = false;
            this.current_description = false;
            this.in_transition = false;
            this.findImages();

            // The slideshow needs a callback to trigger the next image to be shown
            // but we don't want to give it access to the whole gallery instance////////////
            var nextimage_callback = function(callback) {
                return context.nextImage(callback);
            };
            this.slideshow = new AdGallerySlideshow(nextimage_callback, this.settings.slideshow);
            this.controls.append(this.slideshow.create());
            if(this.settings.slideshow.enable) {
                this.slideshow.enable();
            } else {
                this.slideshow.disable();
            }

            if (this.settings.display_next_and_prev) {
                this.initNextAndPrev();
            }
            if (this.settings.display_back_and_forward) {
                this.initBackAndForward();
            }
            if (this.settings.enable_keyboard_move) {
                this.initKeyEvents();
            }
            this.initHashChange();
            var start_at = parseInt(this.settings.start_at_index, 10);
            if (typeof this.getIndexFromHash() != "undefined") {
                start_at = this.getIndexFromHash();
            }
            this.loading(true);
            this.showImage(start_at,
                function() {
                  // We don't want to start the slideshow before the image has been
                  // displayed
                    if (this.settings.slideshow.autostart) {
                        this.preloadImage(start_at + 1);
                        this.slideshow.start();
                    }
                });
            this.fireCallback(this.settings.callbacks.init);
        },

        setupElements: function() {
            this.image_wrapper = this.wrapper.find('.ad-image-wrapper');
            this.image_wrapper.empty();
            this.loader = $('<img class="ad-loader" src="'+ this.settings.loader_image +'">');
            this.image_wrapper.append(this.loader);
            this.loading(false); 

            this.controls = this.wrapper.find('.ad-controls');
            this.gallery_info = $('<p class="ad-info"></p>');
            this.controls.append(this.gallery_info);
            
            this.nav = this.wrapper.find('.ad-nav');
            this.thumbs_wrapper = this.nav.find('.ad-thumbs');

            this.preloads = $('<div class="ad-preloads"></div>');   // 大图加载后放到preloads里
            $(document.body).append(this.preloads);
        },

        loading: function(bool) {
            if (bool) {
                this.loader.show();
            } else {
                this.loader.hide();
            }
        },

        setupAnimations: function() {
            this.animations = {
                'slide-vert': VerticalSlideAnimation,
                'slide-hori': HorizontalSlideAnimation,
                'resize': ResizeAnimation,
                'fade': FadeAnimation,
                'none': NoneAnimation
            };
        },

        findImages: function() {
            var context = this;
            this.images = [];
            
            var thumbs = this.thumbs_wrapper.find('a');
            var thumb_count = thumbs.length;
            var thumbs_loaded = 0;

            if (this.settings.thumb_opacity < 1) {
                thumbs.find('img').css('opacity', this.settings.thumb_opacity);
            }
            thumbs.each(function(i) {
                var link = $(this);
                link.data("ad-i", i);
                var image_src = link.attr('href');
                var thumb = link.find('img');
                context.whenImageLoaded(thumb[0], function() {
                    var width = thumb[0].parentNode.parentNode.offsetWidth;
                    if (thumb[0].width == 0) {
                      // If the browser tells us that the image is loaded, but the width
                      // is still 0 for some reason, we default to 100px width.
                      // It's not very nice, but it's better than 0.
                        width = 100;
                    }
                    context.thumbs_wrapper_width += width;
                    thumbs_loaded++;
                });
                context._initLink(link);
                context.images[i] = context._createImageData(link, image_src);
            });
            // Wait until all thumbs are loaded, and then set the width of the ul
            var inter = setInterval(function() {
                if (thumb_count == thumbs_loaded) {
                    context._setThumbListWidth(context.thumbs_wrapper_width);
                    clearInterval(inter);
                };
            }, 100);
        },

        whenImageLoaded: function(img, callback) {
            if (this.isImageLoaded(img)) {
                callback && callback();/////////////////////////
            } else {
                $(img).load(callback);/////////////////////////
            }
        },

        /*
         * 判断图片是否加载完毕  根据complete和naturalWidth两个属性判断
         */
        isImageLoaded: function(img) {
            if (typeof img.complete != 'undefined' && !img.complete) {//////////
                return false;
            }
            if (typeof img.naturalWidth != 'undefined' && img.naturalWidth == 0) {//////////
                return false;
            }
            return true;
        },

        _initLink: function(link) {
            var context = this;
            link.click(function() {
                context.showImage(link.data("ad-i"));
                context.slideshow.stop();
                return false;   // 阻止事件冒泡，同时取消默认点击行为
            }).hover(function() {
                if (!$(this).is('.ad-active') && context.settings.thumb_opacity < 1) {
                    $(this).find('img').fadeTo(300, 1);
                }
                context.preloadImage(link.data("ad-i"));
            },function() {
                if (!$(this).is('.ad-active') && context.settings.thumb_opacity < 1) {
                    $(this).find('img').fadeTo(300, context.settings.thumb_opacity);
                }
            });
        },

        _createImageData: function(thumb_link, image_src) {   
            var thumb_img = thumb_link.find("img");

            var title = false;
            if (thumb_img.data('ad-title')) {
                title = thumb_img.data('ad-title');
            } else if (thumb_img.attr('title') && thumb_img.attr('title').length) {
                title = thumb_img.attr('title');
            }
            var desc = false;
            if (thumb_img.data('ad-desc')) {
                desc = thumb_img.data('ad-desc');
            } else if (thumb_img.attr('alt') && thumb_img.attr('alt').length) {
                desc = thumb_img.attr('alt');
            }
            var link = false;       // 大图的外链
            if (thumb_img.data('ad-link')) {
                link = thumb_link.data('ad-link');
            } else if (thumb_img.attr('longdesc') && thumb_img.attr('longdesc').length) {
                link = thumb_img.attr('longdesc');
            }
            return {
                thumb_link: thumb_link, 
                image_src: image_src,
                title: title,
                desc: desc,                    
                link: link,
                size: false,
                error: false,
                preloaded: false
            };
        },

        /**
        * @param function callback Gets fired when the image has loaded, is displaying
        *                          and it's animation has finished
        */
        showImage: function(index, callback) {
            if (this.images[index] && !this.in_transition && index != this.current_index) {
                var context = this;
                var image = this.images[index];
                this.in_transition = true;
                if (!image.preloaded) {
                    this.loading(true);
                    this.preloadImage(index, function() {
                        this.loading(false);
                        context._showWhenLoaded(index, callback);
                    });
                } else {
                  this._showWhenLoaded(index, callback);
                }
            }
        },

        preloadImage: function(index, callback) {
            if (this.images[index]) {
                var image = this.images[index];
                if (!this.images[index].preloaded) {
                    var $img = $(new Image());
                    $img.attr('src', image.image_src);
                    if (!this.isImageLoaded($img[0])) {
                        this.preloads.append($img);
                        var context = this;
                        $img.load(function() {
                            image.preloaded = true;
                            image.size = { 
                                width: this.width, 
                                height: this.height
                            };
                            context.fireCallback(callback);
                        }).error(function() {
                            image.error = true;
                            image.preloaded = false;
                            image.size = false;
                        });
                    } else {
                        image.preloaded = true;
                        image.size = {
                            width: $img[0].width, 
                            height: $img[0].height 
                        };
                        this.fireCallback(callback);
                    }
                } else {
                    this.fireCallback(callback);
                }
            }
        },

        preloadAll: function() {
            var context = this;
            var i = 0;
            function preloadNext() {
                if(i < context.images.length) {
                    i++;
                    context.preloadImage(i, preloadNext);
                }
            }
            context.preloadImage(i, preloadNext);
        },

        /**
         * @param function callback Gets fired when the image has loaded, is displaying
         *                          and it's animation has finished
         */
        _showWhenLoaded: function(index, callback) {
            if (this.images[index]) {
                var context = this;
                var image = this.images[index];
                var img_container = $(document.createElement('div')).addClass('ad-image');
                // var img_container = $('<div class="ad-image"></div>');   img_container 为新建的
                var img = $(new Image()).attr('src', image.image_src);
                if (image.link) {
                    var link = $('<a href="'+ image.link +'" target="_blank"></a>');
                    link.append(img);
                    img_container.append(link);
                } else {
                    img_container.append(img);
                }
                this.image_wrapper.prepend(img_container);      // 将新建的img_container加到image_wrapper中,此时新图片不会显示（被后边的就图片遮盖）
                var size = this._getContainedImageSize(image.size.width, image.size.height);
                img.attr('width', size.width);
                img.attr('height', size.height);
                img_container.css({width: size.width +'px', height: size.height +'px'});
                this._centerImage(img_container, size.width, size.height);
                var desc = this._getDescription(image);
                if (desc) {
                    if (!this.settings.description_wrapper && !this.settings.hooks.displayDescription) {
                        img_container.append(desc);
                        var width = size.width - parseInt(desc.css('padding-left'), 10) - parseInt(desc.css('padding-right'), 10);
                        desc.css('width', width +'px');
                    } else if (this.settings.hooks.displayDescription) {
                        this.settings.hooks.displayDescription.call(this, image);
                    } else {
                        var wrapper = this.settings.description_wrapper;
                        wrapper.append(desc);
                    }
                }
                this.highLightThumb(image.thumb_link);
                
                var direction = 'right';
                if (this.current_index < index) {
                  direction = 'left';
                }
                this.fireCallback(this.settings.callbacks.beforeImageVisible);
                if (this.current_image || this.settings.animate_first_image) {
                    var animation_speed = this.settings.animation_speed;
                    var easing = 'swing';
                    var animation = this.animations[this.settings.effect].call(this, img_container, direction, desc);
                    if (typeof animation.speed != 'undefined') {
                        animation_speed = animation.speed;
                    }
                    if (typeof animation.easing != 'undefined') {
                        easing = animation.easing;
                    }
                    if (this.current_image) {
                        var old_image = this.current_image;
                        var old_description = this.current_description;
                        old_image.animate(animation.old_image, animation_speed, easing, function() {
                            old_image.remove();
                            if (old_description) 
                                old_description.remove();
                        });
                    }
                    img_container.animate(animation.new_image, animation_speed, easing, function() {
                        context.current_index = index;
                        context.current_image = img_container;
                        context.current_description = desc;
                        context.in_transition = false;
                        context._afterShow();
                        context.fireCallback(callback);
                    });
                } else {
                    this.current_index = index;
                    this.current_image = img_container;
                    context.current_description = desc;
                    this.in_transition = false;
                    context._afterShow();
                    this.fireCallback(callback);
                }
            }
        },

        _setThumbListWidth: function(wrapper_width) {
            wrapper_width -= 100;   ///?????
            var list = this.nav.find('.ad-thumb-list');
            list.css('width', wrapper_width +'px');
            var i = 1;
            var last_height = list.height();
            while(i < 201) {    ///?????
                list.css('width', (wrapper_width + i) +'px');
                if (last_height != list.height()) {
                    break;
                }
                last_height = list.height();
                i++;
            }
            if (list.width() < this.nav.width()) {
                list.width(this.nav.width());
            }
        },

        initNextAndPrev: function() {
            this.next_link = $('<div class="ad-next"><div class="ad-next-image"></div></div>');
            this.prev_link = $('<div class="ad-prev"><div class="ad-prev-image"></div></div>');
            this.image_wrapper.append(this.next_link);
            this.image_wrapper.append(this.prev_link);
            var context = this;
            this.prev_link.add(this.next_link).mouseover(function(e) {
              // IE 6 hides the wrapper div, so we have to set it's width
                $(this).css('height', context.image_wrapper_height);
                $(this).find('div').show();
            }).mouseout(function(e) {
                $(this).find('div').hide();
            }).click(function() {
                if ($(this).is('.ad-next')) {
                    context.nextImage();
                    context.slideshow.stop();
                } else {
                    context.prevImage();
                    context.slideshow.stop();
                }
            }).find('div').css('opacity', 0.7);
        },

        initBackAndForward: function() {
            var context = this;
            this.scroll_forward = $('<div class="ad-forward"></div>');
            this.scroll_back = $('<div class="ad-back"></div>');
            this.nav.append(this.scroll_forward);
            this.nav.prepend(this.scroll_back);
            var has_scrolled = 0;
            var thumbs_scroll_interval = false;
            $(this.scroll_back).add(this.scroll_forward).click(function() {
                // We don't want to jump the whole width, since an image
                // might be cut at the edge ?????
                var width = context.nav_display_width - 50; ///////////
                if (context.settings.scroll_jump > 0) {
                    var width = context.settings.scroll_jump;
                }
                if ($(this).is('.ad-forward')) {
                    var left = context.thumbs_wrapper.scrollLeft() + width;
                } else {
                    var left = context.thumbs_wrapper.scrollLeft() - width;
                }
                if (context.settings.slideshow.stop_on_scroll) {
                    context.slideshow.stop();
                }
                context.thumbs_wrapper.animate({scrollLeft: left +'px'});
                return false;
            }).css({'opacity': 0.6}).hover(function() {
                var direction = 'left';
                if ($(this).is('.ad-forward')) {
                    direction = 'right';
                }
                thumbs_scroll_interval = setInterval(function() {
                    has_scrolled++;
                    // Don't want to stop the slideshow just because we scrolled a pixel or two
                    if (has_scrolled > 30 && context.settings.slideshow.stop_on_scroll) {
                        context.slideshow.stop();
                    }
                    var left = context.thumbs_wrapper.scrollLeft() + 1; // 用scrollLeft实现图片滚动(外层div设置width:xxpx;overflow:hidden,内层list设置float:left;)(另一种实现滚动的方法：list绝对定位，滚动时设置left值，注意初始化时需设置list的宽度否则滚动时会闪烁)
                    if (direction == 'left') {
                        left = context.thumbs_wrapper.scrollLeft() - 1;
                    }
                    context.thumbs_wrapper.scrollLeft(left);
                }, 10);
                $(this).css('opacity', 1);
            }, function() {
                has_scrolled = 0;
                clearInterval(thumbs_scroll_interval);
                $(this).css('opacity', 0.6);
            });
        },

        initKeyEvents: function() {
            var context = this;
            $(document).keydown(function(e) {
                if (e.keyCode == 39) {
                    // right arrow
                    context.nextImage();
                    context.slideshow.stop();
                } else if (e.keyCode == 37) {
                    // left arrow
                    context.prevImage();
                   context.slideshow.stop();
                }
            });
        },

        initHashChange: function() {
            var context = this;
            if ("onhashchange" in window) {//window.onhashchange
                $(window).bind("hashchange", function() {
                    var index = context.getIndexFromHash();
                    if (typeof index != "undefined" && index != context.current_index) {
                        context.showImage(index);
                    }
                });
            } else {
                var current_hash = window.location.hash;
                setInterval(function() {
                    if (window.location.hash != current_hash) {
                        current_hash = window.location.hash;
                        var index = context.getIndexFromHash();
                        if (typeof index != "undefined" && index != context.current_index) {
                            context.showImage(index);
                        }
                    }
                }, 200);
            }
        },

        getIndexFromHash: function() {
            if (window.location.hash && window.location.hash.indexOf('#ad-image-') === 0) {
                var id = window.location.hash.replace(/^#ad-image-/g, '');
                var thumb = this.thumbs_wrapper.find("#"+ id);
                if (thumb.length) {
                    return this.thumbs_wrapper.find("a").index(thumb);
                } else if (!isNaN(parseInt(id, 10))) {
                    return parseInt(id, 10);
                }
            }
            return undefined;
        },

        nextImage: function(callback) {
            var next = this.nextIndex();
            if (next === false) 
                return false;
            this.preloadImage(next + 1);
            this.showImage(next, callback);
            return true;
        },
        
        prevImage: function(callback) {
            var prev = this.prevIndex();
            if (prev === false) 
                return false;
            this.preloadImage(prev - 1);
            this.showImage(prev, callback);
            return true;
        },

        nextIndex: function() {
            if (this.current_index == (this.images.length - 1)) {
                if (!this.settings.cycle) {
                    return false;
                }
                var next = 0;
            } else {
                var next = this.current_index + 1;
            }
            return next;
        },

        prevIndex: function() {
            if (this.current_index == 0) {
                if (!this.settings.cycle) {
                    return false;
                }
                var prev = this.images.length - 1;
            } else {
                var prev = this.current_index - 1;
            }
            return prev;
        },

        /**
         * Checks if the image is small enough to fit inside the container
         * If it's not, shrink it proportionally
         */
        _getContainedImageSize: function(image_width, image_height) {
            if (image_height > this.image_wrapper_height) {
                var ratio = image_width / image_height;
                image_height = this.image_wrapper_height;
                image_width = this.image_wrapper_height * ratio;
            }
            if (image_width > this.image_wrapper_width) {
                var ratio = image_height / image_width;
                image_width = this.image_wrapper_width;
                image_height = this.image_wrapper_width * ratio;
            }
            return {
                width: image_width, 
                height: image_height
            };
        },

        /**
         * If the image dimensions are smaller than the wrapper, we position
         * it in the middle anyway
         */
        _centerImage: function(img_container, image_width, image_height) {
            img_container.css('top', '0px');
            if (image_height < this.image_wrapper_height) {
                var dif = this.image_wrapper_height - image_height;
                img_container.css('top', (dif / 2) +'px');
            }
            img_container.css('left', '0px');
            if (image_width < this.image_wrapper_width) {
                var dif = this.image_wrapper_width - image_width;
                img_container.css('left', (dif / 2) +'px');
            }
        },

        _getDescription: function(image) {
            var desc = false;
            if (image.desc.length || image.title.length) {
                var title = '';
                if (image.title.length) {
                    title = '<strong class="ad-description-title">'+ image.title +'</strong>';
                };
                var desc = '';
                if (image.desc.length) {
                    desc = '<span>'+ image.desc +'</span>';
                };
                desc = $('<p class="ad-image-description">'+ title + desc +'</p>');
            };
            return desc;
        },

        highLightThumb: function(thumb) {
            this.thumbs_wrapper.find('.ad-active').removeClass('ad-active');
            thumb.addClass('ad-active');
            if (this.settings.thumb_opacity < 1) {
                this.thumbs_wrapper.find('a:not(.ad-active) img').fadeTo(300, this.settings.thumb_opacity);////////
                thumb.find('img').fadeTo(300, 1);
            }
            var left = thumb[0].parentNode.offsetLeft;
            left -= (this.nav_display_width / 2) - (thumb[0].offsetWidth / 2);//////////
            this.thumbs_wrapper.animate({scrollLeft: left +'px'});  // 高亮thumb在nav中居中显示
        },

        _afterShow: function() {
            this.gallery_info.html((this.current_index + 1) +' / '+ this.images.length);
            if (!this.settings.cycle) {
                // Needed for IE
                this.prev_link.show().css('height', this.image_wrapper_height);
                this.next_link.show().css('height', this.image_wrapper_height);
                if (this.current_index == (this.images.length - 1)) {
                  this.next_link.hide();
                }
                if (this.current_index == 0) {
                  this.prev_link.hide();
                }
            }
            if (this.settings.update_window_hash) {
                var thumb_link = this.images[this.current_index].thumb_link;
                if (thumb_link.attr("id")) {
                    window.location.hash = "#ad-image-" + thumb_link.attr("id");
                } else {
                    window.location.hash = "#ad-image-" + this.current_index;
                }
            }
            this.fireCallback(this.settings.callbacks.afterImageVisible);
        },
        
        fireCallback: function(fn) {
            if ($.isFunction(fn)) {
                fn.call(this);
            }
        },

        addImage: function(thumb_url, image_url, image_id, title, description) {
            image_id = image_id || "";
            title = title || "";
            description = description || "";
            var li = $('<li><a href="'+ image_url +'" id="'+ image_id +'">' +
                        '<img src="'+ thumb_url +'" title="'+ title +'" alt="'+ description +'">' +
                        '</a></li>');
            var context = this;
            this.thumbs_wrapper.find("ul").append(li);
          
            var link = li.find("a");
            var thumb = link.find("img");
            thumb.css('opacity', this.settings.thumb_opacity);
          
            this.whenImageLoaded(thumb[0], function() {
                var thumb_width = thumb[0].parentNode.parentNode.offsetWidth;
                if(thumb[0].width == 0) {
                    // If the browser tells us that the image is loaded, but the width
                    // is still 0 for some reason, we default to 100px width.
                    // It's not very nice, but it's better than 0.
                    thumb_width = 100;
                };
                
                context.thumbs_wrapper_width += thumb_width;
                context._setThumbListWidth(context.thumbs_wrapper_width);
            });
            var i = this.images.length;
            link.data("ad-i", i);
            this._initLink(link);
            this.images[i] = context._createImageData(link, image_url);
            this.gallery_info.html((this.current_index + 1) +' / '+ this.images.length);
        },
        
        removeImage: function(index) {
            if(index < 0 || index >= this.images.length) {
                throw "Cannot remove image for index "+ index;
            }
            var image = this.images[index];
            this.images.splice(index, 1);
            var thumb_link = image.thumb_link;
            var thumb_width = thumb_link[0].parentNode.offsetWidth;
            this.thumbs_wrapper_width -= thumb_width;
            thumb_link.remove();
            this._setThumbListWidth(this.thumbs_wrapper_width);
            this.gallery_info.html((this.current_index + 1) +' / '+ this.images.length);
            this.thumbs_wrapper.find('a').each(function(i) {
                $(this).data("ad-i", i);
            });
            if(index == this.current_index && this.images.length != 0) {
                this.showImage(0);
            }
        },

        removeAllImages: function() {
            for (var i = this.images.length - 1; i >= 0; i--) {
                this.removeImage(i);
            }
        },

        addAnimation: function(name, fn) {
            if ($.isFunction(fn)) {
                this.animations[name] = fn;
            }
        },

    };
    
    $.fn.adGallery = function(options) {
        var galleries = [];
        $(this).each(function() {
            var gallery = new AdGallery(this, options);
            galleries[galleries.length] = gallery;
        });
        // Sorry, breaking the jQuery chain because the gallery instances
        // are returned so you can fiddle with them
        return galleries;
    }
    

    function AdGallerySlideshow(nextimage_callback, settings) {
        this.init(nextimage_callback, settings);
    }

    AdGallerySlideshow.prototype = {
        start_link: false,
        stop_link: false,
        countdown: false,
        controls: false,

        settings: false,
        nextimage_callback: false,
        enabled: false,
        running: false,
        countdown_interval: false,

        init: function(nextimage_callback, settings) {
            this.nextimage_callback = nextimage_callback;
            this.settings = settings;
        },

        create: function() {
            this.start_link = $('<span class="ad-slideshow-start">'+ this.settings.start_label +'</span>');
            this.stop_link = $('<span class="ad-slideshow-stop">'+ this.settings.stop_label +'</span>');
            this.countdown = $('<span class="ad-slideshow-countdown"></span>');
            this.controls = $('<div class="ad-slideshow-controls"></div>');
            this.controls.append(this.start_link).append(this.stop_link).append(this.countdown);
            this.countdown.hide();

            var context = this;
            this.start_link.click(function() {
                context.start();
            });
            this.stop_link.click(function() {
                context.stop();
            });
            $(document).keydown(function(e) {
                if(e.keyCode == 83) {
                    // 's'
                    if(context.running) {
                        context.stop();
                    } else {
                        context.start();
                    }
                }
            });
            return this.controls;
        },

        disable: function() {
            this.enabled = false;
            this.stop();
            this.controls.hide();
        },

        enable: function() {
            this.enabled = true;
            this.controls.show();
        },

        toggle: function() {
            if(this.enabled) {
                this.disable();
            } else {
             this.enable();
            }
        },

        start: function() {
            if(this.running || !this.enabled) return false;
            this.running = true;
            this.controls.addClass('ad-slideshow-running');
            this._next();
            this.fireCallback(this.settings.onStart);
            return true;
        },

        stop: function() {
            if(!this.running) return false;
            this.running = false;
            this.countdown.hide();
            this.controls.removeClass('ad-slideshow-running');
            clearInterval(this.countdown_interval);
            this.fireCallback(this.settings.onStop);
            return true;
        },

        //////？？？
        _next: function() {
            var context = this;
            var pre = this.settings.countdown_prefix;
            var su = this.settings.countdown_sufix;
            clearInterval(context.countdown_interval);
            this.countdown.show().html(pre + (this.settings.speed / 1000) + su);
            var slide_timer = 0;
            this.countdown_interval = setInterval(function() {
                slide_timer += 1000;
                if(slide_timer >= context.settings.speed) {
                    var whenNextIsShown = function() {
                        // A check so the user hasn't stoped the slideshow during the
                        // animation
                        if(context.running) {
                            context._next();
                        }
                        slide_timer = 0;
                    }
                    if(!context.nextimage_callback(whenNextIsShown)) {
                        context.stop();
                    }
                    slide_timer = 0;
                }
                var sec = parseInt(context.countdown.text().replace(/[^0-9]/g, ''), 10);
                sec--;
                if(sec > 0) {
                    context.countdown.html(pre + sec + su);
                }
            }, 1000);
        },

        fireCallback: function(fn) {
            if($.isFunction(fn)) {
                fn.call(this);
            }
        }
    };

    function HorizontalSlideAnimation(img_container, direction, desc) {
        var current_left = parseInt(img_container.css('left'), 10);
        if (direction == 'left') {
            var old_image_left = '-'+ this.image_wrapper_width +'px';   // 注意this的指代 fun.call(this,...)
            img_container.css('left', this.image_wrapper_width +'px');
        } else {
            var old_image_left = this.image_wrapper_width +'px';
            img_container.css('left','-'+ this.image_wrapper_width +'px');
        }
        if (desc) {
            desc.css('bottom', '-'+ desc[0].offsetHeight +'px');
            desc.animate({
                bottom: 0
            }, this.settings.animation_speed * 2);
        }
        if (this.current_description) {
            this.current_description.animate({
                bottom: '-'+ this.current_description[0].offsetHeight +'px'
            }, this.settings.animation_speed * 2);
        }
        return {
            old_image: {
                left: old_image_left
            },
            new_image: {
                left: current_left
            }};
    }

    function VerticalSlideAnimation(img_container, direction, desc) {
        var current_top = parseInt(img_container.css('top'), 10);
        if (direction == 'left') {
            var old_image_top = '-'+ this.image_wrapper_height +'px';
            img_container.css('top', this.image_wrapper_height +'px');
        } else {
            var old_image_top = this.image_wrapper_height +'px';
            img_container.css('top', '-'+ this.image_wrapper_height +'px');
        }
        if (desc) {
            desc.css('bottom', '-'+ desc[0].offsetHeight +'px');
            desc.animate({
                bottom: 0
            }, this.settings.animation_speed * 2);
        }
        if (this.current_description) {
            this.current_description.animate({
                bottom: '-'+ this.current_description[0].offsetHeight +'px'
            }, this.settings.animation_speed * 2);
        }
        return {
            old_image: {
                top: old_image_top
            },
            new_image: {
                top: current_top
            }};
    }

    function ResizeAnimation(img_container, direction, desc) {
        var image_width = img_container.width();
        var image_height = img_container.height();
        var current_left = parseInt(img_container.css('left'), 10);
        var current_top = parseInt(img_container.css('top'), 10);
        img_container.css({
            width: 0, 
            height: 0, 
            top: this.image_wrapper_height / 2, 
            left: this.image_wrapper_width / 2
        });
        return {
            old_image: {
                width: 0,
                height: 0,
                top: this.image_wrapper_height / 2,
                left: this.image_wrapper_width / 2
            },
            new_image: {
                width: image_width,
                height: image_height,
                top: current_top,
                left: current_left
            }};
    }

    function FadeAnimation(img_container, direction, desc) {
        img_container.css('opacity', 0);
        return {
            old_image: {opacity: 0},
            new_image: {opacity: 1}
        };
    }

    // Sort of a hack, will clean this up... eventually
    function NoneAnimation(img_container, direction, desc) {
        img_container.css('opacity', 0);
        return {
            old_image: {opacity: 0},
            new_image: {opacity: 1},
            speed: 0
        };
    }

})(jQuery);