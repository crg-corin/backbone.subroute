// backbone-subroute 0.4.5
//
// Copyright (C) 2012 Dave Cadwallader, Model N, Inc.
// Distributed under the MIT License
//
// Documentation and full license available at:
// https://github.com/ModelN/backbone.subroute

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // Register as an AMD module if available...
        define(['underscore', 'backbone'], factory);
    } else if (typeof exports === 'object') {
        // Next for Node.js, CommonJS, browserify...
        module.exports = factory(require('underscore'), require('backbone'));
    } else {
        // Browser globals for the unenlightened...
        factory(_, Backbone);
    }
}(function(_, Backbone) {

    // Adds router to the handler for easy removal
    Backbone.History.prototype.route = function(route, callback, router) {
        this.handlers.unshift({
            route: route,
            callback: callback,
            router: router
        });
    };

    Backbone.SubRoute = Backbone.Router.extend({
        constructor: function(prefix, options) {

            // each subroute instance should have its own routes hash
            this.routes = _.clone(this.routes) || {};

            // Prefix is optional, set to empty string if not passed
            this.prefix = prefix = prefix || "";

            // SubRoute instances may be instantiated using a prefix with or without a trailing slash.
            // If the prefix does *not* have a trailing slash, we need to insert a slash as a separator
            // between the prefix and the sub-route path for each route that we register with Backbone.
            this.separator = (prefix.slice(-1) === "/") ? "" : "/";

            // if you want to match "books" and "books/" without creating separate routes, set this
            // option to "true" and the sub-router will automatically create those routes for you.
            this.createTrailingSlashRoutes = options && options.createTrailingSlashRoutes;

            // Required to have Backbone set up routes
            Backbone.Router.prototype.constructor.call(this, options);

            // grab the full URL
            var hash;
            if (Backbone.history.fragment) {
                hash = Backbone.history.getFragment();
            } else {
                hash = Backbone.history.getHash();
            }

            // Trigger the subroute immediately.  this supports the case where
            // a user directly navigates to a URL with a subroute on the first page load.
            // Check every element, if one matches, break. Prevent multiple matches
            _.every(this.routes, function(key, route) {
                // Use the Backbone parser to turn route into regex for matching
                if (hash.match(Backbone.Router.prototype._routeToRegExp(route))) {
                    Backbone.history.loadUrl(hash);
                    return false;
                }
                return true;
            }, this);

            if (this.postInitialize) {
                this.postInitialize(options);
            }
        },
        navigate: function(route, options) {
            if (route.substr(0, 1) != '/' &&
                route.indexOf(this.prefix.substr(0, this.prefix.length - 1)) !== 0) {

                route = this.prefix +
                    (route ? this.separator : "") +
                    route;
            }
            Backbone.Router.prototype.navigate.call(this, route, options);
        },
        route: function(route, name, callback) {
            // strip off any leading slashes in the sub-route path,
            // since we already handle inserting them when needed.
            if (route.substr(0) === "/") {
                route = route.substr(1, route.length);
            }

            var _route = this.prefix;
            if (route && route.length > 0) {
                if (this.prefix.length > 0)
                    _route += this.separator;

                _route += route;
            }

            if (this.createTrailingSlashRoutes) {
                this.routes[_route + '/'] = name;
                Backbone.Router.prototype.route.call(this, _route + '/', name, callback);
            }

            // remove the un-prefixed route from our routes hash
            delete this.routes[route];

            // add the prefixed-route.  note that this routes hash is just provided
            // for informational and debugging purposes and is not used by the actual routing code.
            this.routes[_route] = name;

            // Proceed as per usual, with one exception.
            // i.e. pass `this` to `Backbone.history.route`.
            if (!_.isRegExp(_route)) _route = this._routeToRegExp(_route);
            if (_.isFunction(name)) {
                callback = name;
                name = '';
            }
            if (!callback) callback = this[name];
            var router = this;
            Backbone.history.route(_route, function(fragment) {
                var args = router._extractParameters(_route, fragment);
                router.execute(callback, args);
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                Backbone.history.trigger('route', router, name, args);
            }, this);
            return this;
        },
        // Remove this router's handlers from Backbone.history
        // and remove all event listeners.
        remove: function() {
            this.off();
            this.stopListening();
            Backbone.history.handlers = _.reject(
                Backbone.history.handlers,
                function(handler) {
                    return handler.router === this;
                }, this);
        }
    });
    return Backbone.SubRoute;
}));
