(function () {

  /* Get container elements */
  var container = document.querySelector('#container');
  var charscontainer = document.querySelector('#chars');

  /* Get buttons */
  var startbutton = document.querySelector('#intro button');
  var winbutton = document.querySelector('#win button');
  var reloadbutton = document.querySelector('#reload');
  var soundbutton = document.querySelector('#sound');
  var errorbutton = document.querySelector('#error button');

  /* Get sounds */
  var winsound = document.querySelector('#winsound');
  var errorsound = document.querySelector('#errorsound');

  /* Prepare canvas */
  var c = document.querySelector('canvas');
  var cx = c.getContext('2d', { willReadFrequently: true }); // Performance optimization
  var letter = null;
  var fontsize = 300;
  var paintcolour = [240, 240, 240];
  var textcolour = [255, 30, 20];
  var xoffset = 0;
  var yoffset = 0;
  var linewidth = 40; // Default, will be updated in init
  var pixels = 0;
  var letterpixels = 0;

  /* Mouse and touch events */
  var mousedown = false;
  var touched = false;
  var oldx = 0;
  var oldy = 0;

  /* Overall game presets */
  var state = 'intro';
  var sound = true;
  var currentstate;

  /* prevent double scoring per win */
  var winSubmitted = false;

  function init() {
    xoffset = container.offsetLeft;
    yoffset = container.offsetTop;
    
    // Adjusted sizes for better gameplay
    fontsize = container.offsetHeight / 1.5;
    linewidth = container.offsetHeight / 10; // Thicker brush for easier painting
    
    paintletter();
    setstate('intro');
  }

  function togglesound() {
    if (sound) {
      sound = false;
      soundbutton.className = 'navbuttonoff';
    } else {
      sound = true;
      soundbutton.className = 'navbutton';
    }
  }

  function showerror() {
    setstate('error');
    if (sound && errorsound && errorsound.play) {
      errorsound.play();
    }
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  function setstate(newstate) {
    state = newstate;
    container.className = newstate;
    currentstate = state; 
  }

  function retry(ev) {
    mousedown = false;
    oldx = 0;
    oldy = 0;
    paintletter(letter);
  }

  function winner() {
    paintletter();
  }

  function start() {
    if (window.ensurePlayerName) {
      window.ensurePlayerName(true); 
    }
    paintletter(letter);
  }

  function cancel() {
    paintletter();
  }

  function paintletter(retryletter) {
    var chars = (charscontainer.textContent || "").replace(/\s+/g, '').split('');
    if (!chars.length) chars = ['अ'];

    letter = retryletter || chars[parseInt(Math.random() * chars.length, 10)];

    c.width = container.offsetWidth;
    c.height = container.offsetHeight;

    cx.clearRect(0, 0, c.width, c.height);

    cx.font = 'bold ' + fontsize + 'px Open Sans';
    cx.fillStyle = 'rgb(' + textcolour.join(',') + ')';
    cx.strokeStyle = 'rgb(' + paintcolour.join(',') + ')';
    cx.shadowOffsetX = 2;
    cx.shadowOffsetY = 2;
    cx.shadowBlur = 4;
    cx.shadowColor = '#666';

    cx.textBaseline = 'baseline';
    cx.lineWidth = linewidth;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    cx.fillText(
      letter,
      (c.width - cx.measureText(letter).width) / 2,
      (c.height / 1.3)
    );

    // Capture the initial letter state
    pixels = cx.getImageData(0, 0, c.width, c.height);

    // Count how many pixels the red letter occupies
    letterpixels = getpixelamount(
      textcolour[0],
      textcolour[1],
      textcolour[2],
      50 // High tolerance for anti-aliasing
    );

    cx.shadowOffsetX = 0;
    cx.shadowOffsetY = 0;
    cx.shadowBlur = 0;

    winSubmitted = false;
    setstate('play');
  }

  function getpixelamount(r, g, b, tol) {
    var px = cx.getImageData(0, 0, c.width, c.height);
    var all = px.data.length;
    var amount = 0;
    tol = (typeof tol === "number") ? tol : 0;

    for (var i = 0; i < all; i += 4) {
      if (
        Math.abs(px.data[i] - r) <= tol &&
        Math.abs(px.data[i + 1] - g) <= tol &&
        Math.abs(px.data[i + 2] - b) <= tol &&
        px.data[i + 3] > 50 // Check alpha
      ) {
        amount++;
      }
    }
    return amount;
  }

  function paint(x, y) {
    if (state !== 'play') return;

    var rx = x - xoffset;
    var ry = y - yoffset;

    var colour = pixelcolour(rx, ry);

    // Check if we hit the background (black/empty)
    if (colour.a === 0 || (colour.r === 0 && colour.g === 0 && colour.b === 0)) {
      showerror();
    } else {
      cx.beginPath();
      if (oldx > 0 && oldy > 0) {
        cx.moveTo(oldx, oldy);
      }
      cx.lineTo(rx, ry);
      cx.stroke();
      cx.closePath();
      oldx = rx;
      oldy = ry;
    }
  }

  function pixelcolour(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    if (!pixels || !pixels.data) return { r: 0, g: 0, b: 0, a: 0 };
    if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    var index = ((y * (pixels.width * 4)) + (x * 4));
    return {
      r: pixels.data[index],
      g: pixels.data[index + 1],
      b: pixels.data[index + 2],
      a: pixels.data[index + 3]
    };
  }

  function pixelthreshold() {
    if (state === 'play') {
      var painted = getpixelamount(
        paintcolour[0],
        paintcolour[1],
        paintcolour[2],
        100 // High tolerance to count light-gray/white pixels
      );

      // Trigger win if 20% of the letter area is covered
      if (letterpixels > 0 && (painted / letterpixels) > 0.20) {
        setstate('win');

        if (sound && winsound && winsound.play) {
          winsound.play();
        }

        if (!winSubmitted) {
          winSubmitted = true;
          if (window.awardPoints) {
            window.awardPoints(10).catch(console.error);
          }
        }
      }
    }
  }

  /* Mouse event listeners */
  function onmouseup(ev) {
    ev.preventDefault();
    oldx = 0;
    oldy = 0;
    mousedown = false;
    pixelthreshold();
  }
  function onmousedown(ev) {
    ev.preventDefault();
    mousedown = true;
  }
  function onmousemove(ev) {
    ev.preventDefault();
    if (mousedown) {
      paint(ev.clientX, ev.clientY);
    }
  }

  /* Touch event listeners */
  function ontouchstart(ev) {
    touched = true;
    var t = ev.changedTouches[0];
    // Start the point so it doesn't jump
    oldx = t.pageX - xoffset;
    oldy = t.pageY - yoffset;
  }
  function ontouchend(ev) {
    touched = false;
    oldx = 0;
    oldy = 0;
    pixelthreshold();
  }
  function ontouchmove(ev) {
    if (touched) {
      paint(ev.changedTouches[0].pageX, ev.changedTouches[0].pageY);
      ev.preventDefault();
    }
  }

  /* Button event handlers */
  if (errorbutton) errorbutton.addEventListener('click', retry, false);
  if (reloadbutton) reloadbutton.addEventListener('click', cancel, false);
  if (soundbutton) soundbutton.addEventListener('click', togglesound, false);
  if (winbutton) winbutton.addEventListener('click', winner, false);
  if (startbutton) startbutton.addEventListener('click', start, false);

  /* Canvas event handlers */
  c.addEventListener('mouseup', onmouseup, false);
  c.addEventListener('mousedown', onmousedown, false);
  c.addEventListener('mousemove', onmousemove, false);
  c.addEventListener('touchstart', ontouchstart, false);
  c.addEventListener('touchend', ontouchend, false);
  c.addEventListener('touchmove', ontouchmove, false);

  window.addEventListener('load', init, false);
  window.addEventListener('resize', init, false);

})();