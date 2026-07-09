var exports = {};
console.log('ts file 1');
var Test1 = (function () {
    function Test1() {
    }
    return Test1;
}());
var testVariable = new Test1();
var defaultVariable = new Test1();
defaultVariable;


var exports = {};
console.log('ts file 2');
var Test2 = (function () {
    function Test2() {
    }
    return Test2;
}());
console.log(testVariable.FirstProperty);
console.log(defaultVariable.FirstProperty);

