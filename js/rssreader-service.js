// Original Code: https://github.com/MichMich/MagicMirror/blob/master/js/news/news.js
// Ported from jQuery to AngularJS. All credits go to the original authors.

(function() {
    'use strict';

    function RssReaderService($http) {
        var service = {};

        service.news_items = [];
        service.seen_news_items = [];
        service.failed_attempts = 0;
        service.base_url = 'https://query.yahooapis.com/v1/public/yql';
        service.url_args = '?format=json&q=select%20*%20from%20rss%20where%20url%3D';
        service.fetch_interval = config.news.fetch_interval || 600000;
        service.update_interval = config.news.update_interval || 6000;
        service.fetchNewsIntervalId = null;
        service.intervalId = null;
        service.showNewsFeed = true;
        service.scope = null;

        service.init = function(scope) {
            if (typeof config.news !== 'undefined' && typeof config.news.rss !== 'undefined') {
                service.scope = scope;
                this.fetchNews();
                this.showNews();

                service.fetchNewsIntervalId = setInterval(function () {
                    this.fetchNews()
                }.bind(this), service.fetch_interval)

                service.intervalId = setInterval(function () {
                    this.showNews();
                }.bind(this), service.update_interval);
            }
        }

        service.buildQueryString = function(feed){
            console.debug('loading rss', feed);
            return this.base_url + this.url_args + '\'' + encodeURIComponent(feed) + '\'&callback=JSON_CALLBACK';
        };

        service.fetchNews = function(){
            this.news_items = [];

            config.news.rss.forEach(function(news) {
                service.fetchFeed(service.buildQueryString(news));
            });
        };

        service.fetchFeed = function(feed){
            $http.jsonp(feed)
                .success(function(data){
                    if (data.query.count > 0) {
                        console.log('rss response', data);
                        service.parseFeed(data.query.results.item);
                    } else {
                        console.error('No feed results for: ' + feed);
                    }
                })
                .error(function(data){
                    console.log('rss error', data);
                });
        };

        service.parseFeed = function(data){
            var _rssItems = [];

            for (var i = 0, count = data.length; i < count; i++) {
                _rssItems.push(data[i].title);
            }

            this.news_items = this.news_items.concat(_rssItems);
        };

        service.showNews = function() {
            if (service.showNewsFeed) {
                // If all items have been seen, swap seen to unseen
                if (this.news_items.length === 0 && this.seen_news_items.length !== 0) {
                    if (this.failed_attempts === 20) {
                        console.error('Failed to show a news story 20 times, stopping any attempts');
                        return false;
                    }

                    this.failed_attempts++;

                    setTimeout(function () {
                        this.showNews();
                    }.bind(this), 3000);

                } else if (this.news_items.length === 0 && this.seen_news_items.length !== 0) {
                    this.news_items = this.seen_news_items.splice(0);
                }

                var _location = Math.floor(Math.random() * this.news_items.length);
                var _item = this.news_items.splice(_location, 1)[0];

                this.seen_news_items.push(_item);
                console.debug('Showing RSS news: ', _item);
                service.scope.rssNews = _item;
            }
        };

        service.enableNews = function() {
            console.debug('enabling news');
            service.showNewsFeed = true;
            service.showNews();
        };

        service.disableNews = function() {
            console.debug('disabling news');
            service.scope.rssNews = '';
            service.showNewsFeed = false;
        };

        return service;
    }

    angular.module('SmartMirror')
        .factory('RssReaderService', RssReaderService);

}());