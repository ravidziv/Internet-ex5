function protoOf(parent) {
	function child() {}
	child.prototype = parent
	return new child;
}
var A = {};
var B = protoOf(A);
var C = protoOf(B);
var D = protoOf(C);

