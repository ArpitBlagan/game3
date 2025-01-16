
template Stats () {  

   // Declaration of signals.  
   signal private input a;  
   signal private input b;  
   signal output c;  

   // Constraints.  
   c === a + b;  
}
component main = Stats();