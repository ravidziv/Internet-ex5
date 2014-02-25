/*global todomvc */
'use strict';

/**
 * Services that persists and retrieves TODOs from localStorage
 */
todomvc.factory('todoStorage', function ($location, $http) {
    function gotoLogin(){
        //goto login page
        $location.path('/login');
    }
	return {
		get: function (callback) {
            $http.get('/item')
                .success(callback)
                .error(gotoLogin);
		},

		addItem: function (newItem, callback) {
            $http.post('/item',  newItem)
                .success(callback)
                .error(gotoLogin);
		},
        delete: function (itemId, callback) {
            $http.delete('/item', {data: {id:itemId}})
                .success(callback)
                .error(gotoLogin);

        },
        deleteAll: function (callback) {
            $http.delete('/item', {data:{id:-1}})
                .success(callback)
                .error(gotoLogin);
        },
        update: function (item, callback) {
            $http.put('/item', {
                'id': item.id,
                'value': item.title,
                'status': item.completed
            }).success(callback)
              .error(gotoLogin);
        }
	};
});
