/* v1.1 */

nRelate.acs({
    rsearch: {
        fkw: function(p) {
            var kws;

            if ((kws = this.xgeba("meta", "property", "og:title")).length > 0) {
                kws = [kws[0].content];
                return kws;
            }

            return this.dfkw(p);
        }
    },

    related: {
        csct: function(plugin, ct, args) {
            alert('test1');

            ct.settings.viewed = true;

            var inner = this.xgebcn('nr_inner', 'div', ct)[0],
                icon = document.createElement('div'),
                close = document.createElement('span'),
                width = window.parent.screen.width,
                height = window.parent.screen.height,
                container = ct.parentNode,
                doc = window.parent.document,
                self = this,
                wait = 1200,
                inOverlay = false,
                bodyTop = 0;

            setTimeout(function() {
                self.xac(icon, 'show');
            }, wait);

            icon.className = 'nr_icon glow';
            icon.innerHTML = '<img class="core" src="http://css.nrcdn.com/images/icon.png">' +
                '<svg class="ring" width="52" height="52">' +
                '<circle id="ring" cx="26" cy="26" r="24" stroke="rgb(255, 255, 255)" stroke-width="2" fill="transparent" />' +
                '</svg>';

            close.className = 'nr_close';
            close.innerHTML = '&#x2715;';

            container.appendChild(icon);
            self.xgebcn('nr_title', 'h3', ct)[0].appendChild(close);

            // assign class name to disclaimer
            self.xac(self.xgebcn('nr_about', 'span', ct)[0].parentNode, 'nr_disclaimer');

            // disable page scroll
            self.bind(doc.body, 'touchmove', function(event) {
                if (inOverlay) {
                    // event.preventDefault();
                }
            });

            // disable scrolling on edge to introduce address bar in Safari
            self.bind(self.xgebcn('nr_title', 'h3', ct)[0], 'touchmove', function(event) {
                event.preventDefault();
            });

            self.bind(self.xgebcn('nr_disclaimer', 'div', ct)[0], 'touchmove', function(event) {
                event.preventDefault();
            });

            self.bind(inner, 'touchstart', function(e) {
                this.allowUp = (this.scrollTop > 0);
                this.allowDown = this.scrollTop < (this.scrollHeight - this.clientHeight);
                this.lastY = e.touches[0].pageY;
            });

            self.bind(inner, 'touchmove', function(event) {
                var up = event.touches[0].pageY > this.lastY;
                var down = !up;
                this.lastY = event.touches[0].pageY;

                if ((up && this.allowUp) || (down && this.allowDown)) {
                    // disable background scrolling
                    event.stopPropagation();
                } else {
                    // disable scrolling for both
                    event.preventDefault();
                }
            });

            // set up widget initial position
            ct.style.top = height + 'px';
            ct.style.display = 'none';

            self.bind(icon, 'mousedown', function(e) {
                self.xac(doc.body, 'icon_tapped');
                ct.style.display = 'block';
                ct.style.top = height + 'px';
            });

            self.bind(icon, 'mouseup', function(e) {
                ct.settings.viewed = false;
                self.cwv(ct, plugin);
                ct.style.top = 0;

                // set height for inner, considering browser addreww bar
                // inner.style.height = (window.parent.innerHeight - 90) + 'px';
                // inner.style.height = window.parent.innerHeight + 'px';
                inOverlay = true;
                // window.parent.scrollTo(0, 1);
                bodyTop = doc.body.scrollTop;
                alert(bodyTop);
            });

            var repaint = function() {
                ct.style.display = 'block';
                ct.style.top = 0;
                ct.style.display = 'none';
            };

            self.bind(close, 'mouseup', function(e) {
                ct.style.top = height + 'px';

                setTimeout(function() {
                    self.xrc(doc.body, 'icon_tapped');
                    ct.style.display = 'none';
                }, 300);

                // repaint();
                inOverlay = false;
                window.parent.scrollTo(0, bodyTop);
            });

            var start = +new Date;
            var clock = 0;

            var timer = setInterval(function() {
                var timeElap = +new Date - start;

                clock++;

                console.log('4000ms has passed');

                self.xrc(icon, 'glow');

                if (clock % 2 === 0)
                    self.xac(icon, 'glow');

            }, 4000);

            /* animate ring effect */
            function getElementBG(elm) {
                var bg = elm.getAttribute('stroke');
                bg = bg.match(/\((.*)\)/)[1];
                bg = bg.split(",");

                for (var i = 0; i < bg.length; i++) {
                    bg[i] = parseInt(bg[i], 10);
                }

                return bg;
            }

            function generateRGB() {
                var color = [];
                for (var i = 0; i < 3; i++) {
                    var num = Math.floor(Math.random() * 225);
                    while (num < 25) {
                        num = Math.floor(Math.random() * 225);
                    }
                    color.push(num);
                }
                return color;
            }

            function rgb2hex(color) {

                return "rgb(" + color[0] + ',' + color[1] + ',' + color[2] + ')';

                var hex = [];
                for (var i = 0; i < 3; i++) {
                    hex.push(color[i].toString(16));
                    if (hex[i].length < 2) {
                        hex[i] = "0" + hex[i];
                    }
                }
                return "#" + hex[0] + hex[1] + hex[2];
            }

            function calculateDistance(current, next) {
                var distance = [];
                for (var i = 0; i < 3; i++) {
                    distance.push(Math.abs(current[i] - next[i]));
                }
                return distance;
            }

            var incrementStops = 1000;

            function calculateIncrement(distance) {
                var increment = [];
                for (var i = 0; i < 3; i++) {
                    increment.push(Math.abs(Math.floor(distance[i] / incrementStops)));
                    if (increment[i] == 0) {
                        increment[i]++;
                    }
                }
                return increment;
            }

            var iteration = Math.round(1000 / (incrementStops / 2));

            function createTransition(id) {
                var elm = doc.getElementById(id);
                var currentColor = getElementBG(elm);
                var randomColor = generateRGB();
                var distance = calculateDistance(currentColor, randomColor);
                var increment = calculateIncrement(distance);

                function transition() {

                    if (currentColor[0] > randomColor[0]) {
                        currentColor[0] -= increment[0];
                        if (currentColor[0] <= randomColor[0]) {
                            increment[0] = 0;
                        }
                    } else {
                        currentColor[0] += increment[0];
                        if (currentColor[0] >= randomColor[0]) {
                            increment[0] = 0;
                        }
                    }

                    if (currentColor[1] > randomColor[1]) {
                        currentColor[1] -= increment[1];
                        if (currentColor[1] <= randomColor[1]) {
                            increment[1] = 0;
                        }
                    } else {
                        currentColor[1] += increment[1];
                        if (currentColor[1] >= randomColor[1]) {
                            increment[1] = 0;
                        }
                    }

                    if (currentColor[2] > randomColor[2]) {
                        currentColor[2] -= increment[2];
                        if (currentColor[2] <= randomColor[2]) {
                            increment[2] = 0;
                        }
                    } else {
                        currentColor[2] += increment[2];
                        if (currentColor[2] >= randomColor[2]) {
                            increment[2] = 0;
                        }
                    }

                    // elm.style.background = rgb2hex(currentColor);
                    elm.setAttribute('stroke', rgb2hex(currentColor));

                    if (increment[0] == 0 && increment[1] == 0 && increment[2] == 0) {
                        clearInterval(handler);
                        createTransition(id);
                    }
                }
                var handler = setInterval(transition, iteration);
            }

            // console.log( document.getElementById('ring') );
            createTransition("ring");
        }
    }
});