window.onload = function() {
  //document.body.style.backgroundColor='hsla(170, 50%, 45%, 1)';
  let divs=document.querySelectorAll('div');
  divs.forEach((d)=>{

  })


  let one=document.querySelector('circle#one');
  let two=document.querySelector('circle#two');
  let three=document.querySelector('circle#three');
  console.dir(one);
  let sat = 10;
  let hue = 0;
  let int=setInterval(function changeColor(){
    (sat===100) ? sat=10 : sat+=1;
    (hue===360) ? hue=0 : hue+=20;
    one.backgroundColor=`hsl(170,${sat}%,1)`;
    two.style.backgroundColor=`hsl(${hue},${100-sat}%,1)`;
    three.style.backgroundColor=`hsl(${hue}+40,${sat}%,1)`;
  //  document.body.style.backgroundColor=`hsla(170,${sat}%,45%,1)`;
  },50);

  setTimeout(function(){
    clearInterval(int)
  },15000);
}
