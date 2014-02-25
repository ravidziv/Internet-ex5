/*global todomvc, angular */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the todoStorage service
 * - exposes the model to the template and provides event handlers
 */
todomvc.controller('TodoCtrl', function TodoCtrl($scope, $routeParams, todoStorage, filterFilter) {
    var todos = $scope.todos = [];
    var isReady = false;
    todoStorage.get(function(data){
        //max id - the next id for new item
        var maxId = 0;
        for(var i=0;i<data.length;i++){
            if(data[i].id>maxId){
                maxId = data[i].id;
            }
        }
        data.push('READY')
        todos = $scope.todos = data;
        $scope.newTodoId = maxId+1;
    });

	$scope.newTodo = '';
    $scope.newTodoId = 0;
	$scope.editedTodo = null;

	$scope.$watch('todos', function (newValue, oldValue) {
        //update scope variable according to todos stats
		$scope.remainingCount = filterFilter(todos, { completed: false }).length;
		$scope.completedCount = todos.length - $scope.remainingCount;
		$scope.allChecked = !$scope.remainingCount;
        $scope.HasTodos = todos.length;

        //update the server
        if(oldValue.indexOf('READY')>-1){
            return;
        }
        if(newValue.indexOf('READY')>-1){
            isReady = true;
            newValue.splice(newValue.indexOf("READY"),1);
            $scope.todos = todos = newValue;

            return;
        }
		if (!$scope.editedTodo && newValue !== oldValue && isReady) { // This prevents unneeded calls to the server
            if(oldValue.length>0 && newValue.length==0){
                //delete all
                todoStorage.deleteAll(function(d) {
                    $scope.status = d.responseText;
                });
            }
            else {
                var old_ids = {};
                var deleted_items = [];
                for(var i=0;i<oldValue.length;i++){
                    old_ids[oldValue[i].id] = oldValue[i];
                    deleted_items.push(oldValue[i].id);
                }

                for(var i=0;i<newValue.length;i++){
                    if(!old_ids[newValue[i].id]){
                        todoStorage.addItem({
                            id: newValue[i].id,
                            value: newValue[i].title
                        }, function(d) {
                            $scope.status = d.responseText;
                        });
                    }
                    else {
                        if(deleted_items.indexOf(newValue[i].id)>-1){
                            deleted_items.splice(deleted_items.indexOf(newValue[i].id),1);
                        }
                        if (old_ids[newValue[i].id].title!=newValue[i].title || old_ids[newValue[i].id].completed!=newValue[i].completed ){
                            //update
                            todoStorage.update(newValue[i], function(d) {
                                $scope.status = d.responseText;
                            });
                        }
                    }
                }
                for(var i=0;i<deleted_items.length;i++){
                    //delete
                    todoStorage.delete(deleted_items[i], function(d) {
                        $scope.status = d.responseText;
                    });
                }
            }
		}

	}, true);

	// Monitor the current route for changes and adjust the filter accordingly.

	$scope.$on('$routeChangeSuccess', function () {

		var status = $scope.status = $routeParams.status || '';

		$scope.statusFilter = (status === 'active') ?
			{ completed: false } : (status === 'completed') ?
			{ completed: true } : null;
	});

	$scope.addTodo = function () {
		var newTodo = $scope.newTodo.trim();
		if (!newTodo.length) {
			return;
		}
		todos.push({
            id: $scope.newTodoId,
			title: newTodo,
			completed: false
		});

		$scope.newTodo = '';
        $scope.newTodoId++;
	};

	$scope.editTodo = function (todo) {
		$scope.editedTodo = todo;
		// Clone the original todo to restore it on demand.
		$scope.originalTodo = angular.extend({}, todo);

	};

	$scope.doneEditing = function (todo) {
		$scope.editedTodo = null;
		todo.title = todo.title.trim();

        // we ignore update to server during editing - to eliminate many calls to server
        // so in the end we have to update
        todoStorage.update(todo, function(d) {
            $scope.status = d.responseText;
        });
		if (!todo.title) {
			$scope.removeTodo(todo);
		}
	};

	$scope.revertEditing = function (todo) {
        todos[todos.indexOf(todo)] = $scope.originalTodo;
		$scope.doneEditing($scope.originalTodo);
        $scope.todos  = todos;
    };

	$scope.removeTodo = function (todo) {
        todos.splice(todos.indexOf(todo), 1);

        $scope.todos = todos;
    };

	$scope.clearAll = function () {
		$scope.todos = todos = todos.filter(function (val) {
			return false;
		});
	};

	$scope.markAll = function (completed) {
		todos.forEach(function (todo) {
			todo.completed = !completed;
		});
	};
});
