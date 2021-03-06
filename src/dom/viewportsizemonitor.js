// Copyright 2007 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utility class that monitors viewport size changes.
 *
 * @author attila@google.com (Attila Bodis)
 * @author alexeykofficial@google.com (Alex K)
 * @see ../demos/viewportsizemonitor.html
 */

goog.provide('rflect.dom.ViewportSizeMonitor');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.math.Size');
goog.require('goog.userAgent');



/**
 * This class can be used to monitor changes in the viewport size.  Instances
 * dispatch a {@link goog.events.EventType.RESIZE} event when the viewport size
 * changes.  Handlers can call {@link rflect.dom.ViewportSizeMonitor#getSize} to
 * get the new viewport size.
 *
 * Use this class if you want to execute resize/reflow logic each time the
 * user resizes the browser window.  This class is guaranteed to only dispatch
 * {@code RESIZE} events when the pixel dimensions of the viewport change.
 * (Internet Explorer fires resize events if any element on the page is resized,
 * even if the viewport dimensions are unchanged, which can lead to infinite
 * resize loops.)
 *
 * Example usage:
 *  <pre>
 *    var vsm = new rflect.dom.ViewportSizeMonitor();
 *    goog.events.listen(vsm, goog.events.EventType.RESIZE, function(e) {
 *      alert('Viewport size changed to ' + vsm.getSize());
 *    });
 *  </pre>
 *
 * Manually verified on IE6, IE7, FF2, Opera 9, and WebKit.  {@code getSize}
 * doesn't always return the correct viewport height on Safari 2.0.4.
 *
 * @param {Window=} opt_window The window to monitor; defaults to the window in
 *    which this code is executing.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
rflect.dom.ViewportSizeMonitor = function(opt_window) {
  goog.events.EventTarget.call(this);

  // Default the window to the current window if unspecified.
  this.window = opt_window || window;

  // Listen for window resize events.
  this.listenerKey_ = goog.events.listen(this.window,
      goog.events.EventType.RESIZE, this.handleResize_, false, this);

  // Set the initial size.
  this.size = goog.dom.getViewportSize(this.window);

  if (this.isPollingRequired_()) {
    this.windowSizePollInterval = window.setInterval(
        goog.bind(this.checkForSizeChange, this),
        rflect.dom.ViewportSizeMonitor.WINDOW_SIZE_POLL_RATE);
  }
};
goog.inherits(rflect.dom.ViewportSizeMonitor, goog.events.EventTarget);


/**
 * Returns a viewport size monitor for the given window.  A new one is created
 * if it doesn't exist already.  This prevents the unnecessary creation of
 * multiple spooling monitors for a window.
 * @param {Window=} opt_window The window to monitor; defaults to the window in
 *     which this code is executing.
 * @return {rflect.dom.ViewportSizeMonitor} Monitor for the given window.
 */
rflect.dom.ViewportSizeMonitor.getInstanceForWindow = function(opt_window) {
  var currentWindow = opt_window || window;
  var uid = goog.getUid(currentWindow);

  return rflect.dom.ViewportSizeMonitor.windowInstanceMap_[uid] =
      rflect.dom.ViewportSizeMonitor.windowInstanceMap_[uid] ||
      new rflect.dom.ViewportSizeMonitor(currentWindow);
};


/**
 * Removes and disposes a viewport size monitor for the given window if one
 * exists.
 * @param {Window=} opt_window The window whose monitor should be removed;
 *     defaults to the window in which this code is executing.
 */
rflect.dom.ViewportSizeMonitor.removeInstanceForWindow = function(opt_window) {
  var uid = goog.getUid(opt_window || window);

  goog.dispose(rflect.dom.ViewportSizeMonitor.windowInstanceMap_[uid]);
  delete rflect.dom.ViewportSizeMonitor.windowInstanceMap_[uid];
};


/**
 * Map of window hash code to viewport size monitor for that window, if
 * created.
 * @type {Object.<number,rflect.dom.ViewportSizeMonitor>}
 * @private
 */
rflect.dom.ViewportSizeMonitor.windowInstanceMap_ = {};


/**
 * Rate in milliseconds at which to poll the window size on browsers that
 * need polling.
 * @type {number}
 */
rflect.dom.ViewportSizeMonitor.WINDOW_SIZE_POLL_RATE = 500;


/**
 * Event listener key for window the window resize handler, as returned by
 * {@link goog.events.listen}.
 * @type {goog.events.Key}
 * @private
 */
rflect.dom.ViewportSizeMonitor.prototype.listenerKey_ = null;


/**
 * The window to monitor.  Defaults to the window in which the code is running.
 * @type {Window}
 * @protected
 */
rflect.dom.ViewportSizeMonitor.prototype.window = null;


/**
 * The most recently recorded size of the viewport, in pixels.
 * @type {goog.math.Size?}
 * @protected
 */
rflect.dom.ViewportSizeMonitor.prototype.size = null;


/**
 * Identifier for the interval used for polling the window size on Windows
 * Safari.
 * @type {?number}
 * @protected
 */
rflect.dom.ViewportSizeMonitor.prototype.windowSizePollInterval = null;


/**
 * Checks if polling is required for this user agent. Opera only requires
 * polling when the page is loaded within an IFRAME.
 * @return {boolean} Whether polling is required.
 * @private
 */
rflect.dom.ViewportSizeMonitor.prototype.isPollingRequired_ = function() {
  return goog.userAgent.WEBKIT && goog.userAgent.WINDOWS ||
      goog.userAgent.OPERA && this.window.self != this.window.top;
};


/**
 * Returns the most recently recorded size of the viewport, in pixels.  May
 * return null if no window resize event has been handled yet.
 * @return {goog.math.Size} The viewport dimensions, in pixels.
 */
rflect.dom.ViewportSizeMonitor.prototype.getSize = function() {
  // Return a clone instead of the original to preserve encapsulation.
  return this.size ? this.size.clone() : null;
};


/** @override */
rflect.dom.ViewportSizeMonitor.prototype.disposeInternal = function() {
  rflect.dom.ViewportSizeMonitor.superClass_.disposeInternal.call(this);

  if (this.listenerKey_) {
    goog.events.unlistenByKey(this.listenerKey_);
    this.listenerKey_ = null;
  }

  if (this.windowSizePollInterval) {
    window.clearInterval(this.windowSizePollInterval);
    this.windowSizePollInterval = null;
  }

  this.window = null;
  this.size = null;
};


/**
 * Handles window resize events by measuring the dimensions of the
 * viewport and dispatching a {@link goog.events.EventType.RESIZE} event if the
 * current dimensions are different from the previous ones.
 * @param {goog.events.Event} event The window resize event to handle.
 * @private
 */
rflect.dom.ViewportSizeMonitor.prototype.handleResize_ = function(event) {
  this.checkForSizeChange();
};


/**
 * Measures the dimensions of the viewport and dispatches a
 * {@link goog.events.EventType.RESIZE} event if the current dimensions are
 * different from the previous ones.
 * @protected
 */
rflect.dom.ViewportSizeMonitor.prototype.checkForSizeChange = function() {
  var size = goog.dom.getViewportSize(this.window);
  if (!goog.math.Size.equals(size, this.size)) {
    this.size = size;
    this.dispatchEvent(goog.events.EventType.RESIZE);
  }
};
