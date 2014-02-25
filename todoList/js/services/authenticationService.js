/*global todomvc */
'use strict';

/**
 * Services that persists and retrieves TODOs from localStorage
 */
todomvc.factory('authenticationService', function ($http, $route) {
    return {
        register: function (fullname, username, password, callback) {
            $http.post('/register',{
                username: username,
                fullname: fullname,
                password: password
            }, callback);
        },

        login: function (username, password, callback) {
            //in terms of design it would be better to use post
            //but we are required to use get
            $http.get('/login',{
                username: username,
                password: password
            }, function(){
                callback();
            })
        }
    };
});
