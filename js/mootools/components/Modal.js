/**
 * @copyright   2010-2013, The Titon Project
 * @license     http://opensource.org/licenses/bsd-license.php
 * @link        http://titon.io
 */

(function() {
    'use strict';

Toolkit.Modal = new Class({
    Extends: Toolkit.Component,
    Binds: ['__submit'],

    /** Blackout instance if options.blackout is true */
    blackout: null,

    /** Drag instance if options.draggable is true */
    drag: null,

    /** Body DOM element */
    elementBody: null,

    /** Default options */
    options: {
        delegate: '.js-modal',
        animation: 'fade',
        ajax: true,
        draggable: false,
        blackout: true,
        showLoading: true,
        fullScreen: false,
        getContent: 'data-modal',
        contentElement: '.modal-inner',
        closeElement: '.modal-close',
        closeEvent: '.modal-event-close',
        submitEvent: '.modal-event-submit',
        template: '<div class="modal">' +
            '<div class="modal-handle">' +
                '<div class="modal-inner"></div>' +
                '<a href="javascript:;" class="modal-close modal-event-close"><span class="x"></span></a>' +
            '</div>' +
        '</div>',

        // Events
        onSubmit: null
    },

    /**
     * Initialize the component by fetching elements and binding events.
     *
     * @param {Elements} elements
     * @param {Object} [options]
     */
    initialize: function(elements, options) {
        this.parent(options);
        this.setNodes(elements);
        this.createElement();

        if (this.options.fullScreen) {
            this.element.addClass(Toolkit.options.isPrefix + 'fullscreen');
            this.options.draggable = false;
        }

        // Get elements
        this.elementBody = this.element.getElement(this.options.contentElement);

        // Draggable
        if (this.options.draggable) {
            this.drag = new Drag(this.element, {
                onStart: function(element) {
                    element.addClass(Toolkit.options.isPrefix + 'dragging');
                },
                onComplete: function(element) {
                    element.removeClass(Toolkit.options.isPrefix + 'dragging');
                }
            });

            this.element.addClass(Toolkit.options.isPrefix + 'draggable');
        }

        // Blackout
        if (this.options.blackout) {
            this.blackout = new Toolkit.Blackout();
            this.blackout.element.addEvent('click', this.__hide);
        }

        // Set events
        this.bindEvents();
        this.fireEvent('init');
    },

    /**
     * Set delegation and window events.
     *
     * @returns {Toolkit.Modal}
     */
    bindEvents: function() {
        this.parent();

        window.addEvent('keydown', function(e) {
            if (e.key === 'esc' && this.isVisible()) {
                this.hide();
            }
        }.bind(this));

        this.element
            .addEvent('click:relay(' + this.options.closeEvent + ')', this.__hide)
            .addEvent('click:relay(' + this.options.submitEvent + ')', this.__submit);

        return this;
    },

    /**
     * Hide the modal.
     *
     * @returns {Toolkit.Modal}
     */
    hide: function() {
        return this.parent(function() {
            if (this.options.blackout) {
                this.blackout.hide();
            }
        }.bind(this));
    },

    /**
     * Position the modal in the center of the screen.
     *
     * @param {String|Element} content
     * @returns {Toolkit.Modal}
     */
    position: function(content) {
        // AJAX is currently loading
        if (content === true) {
            return this;
        }

        this.elementBody.set('html', content);
        this.fireEvent('load', content);

        if (!this.isVisible()) {
            if (this.options.blackout) {
                this.blackout.show();
            }

            if (this.options.fullScreen) {
                this.element.getElement(this.options.contentElement).setStyle('min-height', window.getHeight());
            }

            this.element.reveal();

            // IE8
            if (Browser.ie8 && !this.options.fullScreen) {
                var size = this.element.getSize();

                this.element.setStyles({
                    'margin-left': -(size.x / 2),
                    'margin-top': -(size.y / 2)
                });
            }
        }

        this.fireEvent('show');

        return this;
    },

    /**
     * Show the modal with the specific content.
     * If a node is passed, grab the modal AJAX URL or target element.
     * If content is passed, display it immediately.
     *
     * @param {Element} node
     * @param {String|Element} [content]
     * @returns {Toolkit.Modal}
     */
    show: function(node, content) {
        var options = this.options,
            preAjaxValue = options.ajax;

        // Get content
        if (content) {
            options.ajax = false;

        } else if (node) {
            content = this.readValue(node, options.getContent) || node.get('href');

            if (content && content.substr(0, 1) === '#') {
                options.ajax = false;
            }
        }

        if (!content) {
            return this;
        }

        this.node = node;

        if (options.ajax) {
            if (this.cache[content]) {
                this.position(this.cache[content]);
            } else {
                this.requestData(content);
            }
        } else {
            this.position(content);
        }

        // Reset back to original state
        this.options.ajax = preAjaxValue;

        return this;
    },

    /**
     * Submit the form within the modal if it exists and re-render the modal with the response.
     *
     * @private
     * @param {DOMEvent} e
     */
    __submit: function(e) {
        e.preventDefault();

        var button = e.target,
            form = this.elementBody.getElement('form');

        if (!form) {
            return;
        }

        this.fireEvent('submit', button);

        new Request({
            url: form.get('action'),
            method: form.get('method').toUpperCase(),
            data: form.toQueryString(),
            evalScripts: true,
            onSuccess: function(response) {
                this.position(response);
            }.bind(this),
            onFailure: function() {
                this.position(this._errorTemplate());
            }.bind(this)
        }).send();
    }

});

/**
 * Enable modals on Elements collections by calling modal().
 * An object of options can be passed as the 1st argument.
 * The class instance will be cached and returned from this function.
 *
 * @example
 *     $$('.js-modal').modal({
 *         draggable: true
 *     });
 *
 * @param {Object} [options]
 * @returns {Toolkit.Modal}
 */
Elements.implement('modal', function(options) {
    var modal = new Toolkit.Modal(this, options);

    return this.each(function(el) {
        if (!el.$modal) {
            el.$modal = modal;
        }
    });
});

})();