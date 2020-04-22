import defaultVariable, { testVariable } from './tsFile1';

console.log('ts file 2');

class Test2 {
	SecondProperty: string;
}

console.log(testVariable.FirstProperty);
console.log(defaultVariable.FirstProperty);
