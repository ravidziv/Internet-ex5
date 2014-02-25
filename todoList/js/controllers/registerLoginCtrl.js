/*global todomvc, angular */
'use strict';

/**
 * The main controller for the app. The controller:
 * - exposes the model to the template and provides event handlers
 */
todomvc.controller('LoginRegisterCtrl', function LoginRegisterCtrl($scope, $http, $location, authenticationService) {

    $scope.status = 'Not logged in'
    $scope.username = '';
    $scope.password = '';
    $scope.passwordVerification = '';
    $scope.fullname = '';

    //

    $scope.register = function(){
        var username = $scope.username;
        var password = $scope.password;
        var fullname = $scope.fullname;
        var passwordVerification = $scope.passwordVerification;

        if(username.length==0){
            $scope.status="Error: Please enter user name";
            return;
        }
        if(fullname.length==0){
            $scope.status="Error: Please enter full name";
            return;
        }
        if(passwordVerification!=password){
            $scope.status="Error: password didn't match";
            return;
        }
        $http.post( '/register', {
            username: username,
            fullname: fullname,
            password: password
        }).success(function(d){
           if(d=='Success'){
                $location.path('');
            }
            $scope.status = d;
        }).error(function(d){
            $scope.status = d;
        });
    }

    $scope.login = function(){
        var username = $scope.username;
        var password = $scope.password;

        $http.get( '/login', { params: {
            username: username,
            password: password
        }
        }).success(function(d){
                //$scope.status = d;
                if(d=='OK'){
                    $location.path('');//go to to todo list
                }
            }).error(function(d){
                $scope.status = d;
            });
    }


});
