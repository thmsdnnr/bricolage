window.onload = function() {
  //debounce function from Underscore.js
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  function debounce(func, wait, immediate) {
  	var timeout;
  	return function() {
  		var context = this, args = arguments;
  		var later = function() {
  			timeout = null;
  			if (!immediate) func.apply(context, args);
  		};
  		var callNow = immediate && !timeout;
  		clearTimeout(timeout);
  		timeout = setTimeout(later, wait);
  		if (callNow) func.apply(context, args);
  	};
  };

  let gridStates={};
  let modalPopped=false;
  let screenPopped=false;
  let _d=window.INITIAL_STATE;
  let imgDict=_d.dict;

  console.log(window.INITIAL_STATE);
  console.log(_d.userList);

  var elem = document.querySelector('.grid');
  var msnry = new Masonry( elem, {
  // options
  itemSelector: '.grid-item',
  columnWidth: '.grid-sizer',
  percentPosition: true
  });

  function imgError(image) {
      image.onerror = "";
      image.src = "/assets/images/brico.jpeg";
      return true;
  }

  imagesLoaded(elem).on('progress', function(instance, image){
    //TODO since it's a placeholder make sure to NOT display attribution data for it!
    if (!image.isLoaded) { image.img.src='/assets/images/brico.jpeg'; console.log(image);}
    msnry.layout(); //call after each image load
  });

  imagesLoaded(elem).on('done', function() {
    triggerTheMagic();
  });

  // from https://24ways.org/2010/calculating-color-contrast/
  function whatColorText(hexcolor){ //white or black, which is more contrasty?
	var r = parseInt(hexcolor.substr(0,2),16);
	var g = parseInt(hexcolor.substr(2,2),16);
	var b = parseInt(hexcolor.substr(4,2),16);
	var yiq = ((r*299)+(g*587)+(b*114))/1000;
	return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

  let lastElement;
  let padding=1; //px
  function updateToolTip() {
    //console.log('gridstate', gridStates[lastElement.id]);
    if(lastElement&&!modalPopped) {
      let v=imgDict[lastElement.id.slice(2)]; //TODO this lopping off thing tho
      let u=v.imageInfo.user;
      let bgColor=v.imageInfo.color;
      let iBCR=document.querySelector(`img#${lastElement.id}`);
      let bcr=iBCR.getBoundingClientRect(); //TODO this works but fix
      let i=document.querySelector('span#infoBox');
      i.style.border=`5px inset ${bgColor}`;
      //clear existing
      i.innerHTML=null;
      //conditional control display based on maximized/minimized state
      if (gridStates[lastElement.id].minimized) {
        i.innerHTML+=`<div id="RGY"><div id="R" class="light" data-text="${lastElement.id}"></div><div id="G" class="light" data-text="${lastElement.id}"></div></div>`;
      }
      else {
        i.innerHTML+=`<div id="RGY"><div id="R" class="light" data-text="${lastElement.id}"></div><div id="Y" class="light" data-text="${lastElement.id}"></div><div id="G" class="light" data-text="${lastElement.id}"></div></div>`;
      }
      //add tooltip attribution stuff
      let img,name,location,portF;
      (u.profile_image) ? img=`<img src="${u.profile_image.medium}" class="profileImage">` : img='';
      (u.name) ? name=u.name : name='~';
      (u.portfolio_url) ? portF=`<a href="${u.portfolio_url}" target="_new">${name}</a><br />` : portF='';
      (u.location) ? location=`${u.location}` : location = '';

      if (_d.user&&!_d.userList[lastElement.id.slice(2)]) { //TODO that slice two though
        i.innerHTML+=`<div id="addButton"><button id="addButton" data-text="${lastElement.id}" class="wave">ADD+ <3s: ${v.imageInfo.likes}</button></div>`;
      }
      i.innerHTML+=`<span id="boxCont"><div id="attribution" style="background-color:${bgColor}">${img}<span id="name" class="child">${portF}${location}</span>`;
      i.innerHTML+=`</div></span>`;
      i.classList.add('showTip');
      i.style.display='inline';
      i.style.top=bcr.top+padding;
      i.style.left=bcr.left+padding;
      i.style.width=bcr.width-padding*2;
      i.style.height=bcr.height-padding*2;
      i.style.color=whatColorText(bgColor.slice(1)); //lop off the hash
    }
  }

//add listeners
    function triggerTheMagic() {
      let divs=document.querySelectorAll('div.grid-item');
      divs.forEach((d)=>d.addEventListener('mouseover', handleMouse));
      let iBox=document.querySelector('span#infoBox'); //whole info attribution box
      iBox.addEventListener('click', handleDivClick);
      let modBox=document.querySelector('div#RGY'); //close, minimize, maximize buttons upper-left
      iBox.addEventListener('mouseover', handleModBox);
      iBox.addEventListener('mouseout', handleModBox);
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      setGridStates();
  }

  let handleScroll = debounce(function(e){
      updateToolTip();
      recalculateModal();
    },5,true);

  function handleResize(e) {
    recalculateModal();
    updateToolTip();
  }

  function setGridStates() {
    let elements=document.querySelectorAll(`div.grid-item`);
    elements.forEach((ele)=>{
      let bcr=ele.getBoundingClientRect();
      gridStates[ele.id] = {'initialWidth':bcr.width,'initialHeight':bcr.height,'maximized':false,'minimized':false};
    });
  console.log(gridStates);
  }

  function modBoxGlyphs(display='hide') {
    let close=document.querySelector('div#R');
    let minimize=document.querySelector('div#Y');
    let maximize=document.querySelector('div#G');
    if (display==='show') {
      close.innerHTML=`⤫`; //&#10539;'; // ⤫ unicode: U+0292B hex: &#x292B; html: &#10539;
      minimize.innerHTML=`―`; // ― unicode: U+02922 hex: &#x2922 html: &#10530;
      maximize.innerHTML=`⤢`; // ⤢ unicode: U+02015 hex: &#x2015; html: &#8213; htmlentity: &horbar;
    }
    else {
      close.innerHTML='&nbsp;';
      minimize.innerHTML='&nbsp;';
      maximize.innerHTML='&nbsp;';
    }
  }

  function handleModBox(e) {
    if ((e.target.id==='RGY')||((e.target.id==='R'||e.target.id==='G')||e.target.id==='Y')){
    (e.type==='mouseover') ? modBoxGlyphs('show') : modBoxGlyphs('hide');
    }
  }

  function handleMouse(e) {
    lastElement=this;
    updateToolTip();
    }

  function handleDivClick(e) {
    if ((e.target.id==='R'||e.target.id==='G')||e.target.id==='Y') {
      document.querySelector('span#infoBox').style.display='none'; //remove the infobox
      if (e.target.id==='R') { //DELETE
        let ele=document.querySelector(`div.grid-item#${e.target.dataset.text}`);
        undoDeletion(ele,e);
        }
      if (e.target.id==='G') { //maximize
        if (gridStates[e.target.dataset.text].minimized) { //restore to original size
          scaleByFactor(2, e.target.dataset.text);
          gridStates[e.target.dataset.text].minimized=false;
          msnry.layout();
          updateToolTip(); //TODO make this a little cleaner
        }
        else if (!gridStates[e.target.dataset.text].maximized) { //make it big!
            gridStates[e.target.dataset.text].maximized=true;
            popModal(e.target.dataset.text);
            updateToolTip(); //TODO make this a little cleaner
          }
        }
      if (e.target.id==='Y') { //minimize
        //handle maximization, display close box at upper right
        //on close, msnry unstamp(ele)
        //instead of scale, use window size to pop a div.
        if (!gridStates[e.target.dataset.text].minimized) {
          console.log('minimize');
          scaleByFactor(0.5, e.target.dataset.text);
          gridStates[e.target.dataset.text].minimized=true;
          updateToolTip(); //TODO make this a little cleaner
          msnry.layout();
        }
      }
    }
    if (e.target.id==='closeMax') {
      scaleByFactor(0.5,e.target.dataset.text);
      gridStates[e.target.dataset.text].maximized=false;
      updateToolTip();
    }
    if (e.target.id==='addButton') {
      document.querySelector('span#infoBox').style.display='none'; //TODO maybe change this to an "added" thing
      console.log('add button');
      console.log(e.target.dataset.text);
      fetch('/mod',{
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        method: "POST",
        credentials: "include",
        body: `user=${_d.user}&id=${e.target.dataset.text}&action=ADD`
      }).then(response=>{
        toaster(e, 'Good Choice!', 1);
        console.log(response);
        _d.userList[e.target.dataset.text.slice(2)]=1; //TODO that damn slice(2)
      });
    }
  }

  function undoDeletion(element, event) {
    //pop a toast with a link
    //add an event listener on click to redo
    //then setTimeout for element removal and call completeDelete
    element.style.display='none';
    let id=event.target.dataset.text; //need to slice off the Z_ with slice(2) in the fetch to server!
    msnry.layout();
    let toasty;
    toaster(event, '<a href="#" id="undo">You sure? Click->Undo</a>', 3, function(toastSlice) {
      toasty=toastSlice;
      document.querySelector('a#undo').addEventListener('click',cancelDeletion,true);
    });

    let countdownToDestruction = setTimeout(function(){completeDelete(element,id);},3000);

    function cancelDeletion(e) {
      toasty.style.display='none';
      toaster(e, 'You turned back time. YOU FOUND A WAY!', 3);
      clearTimeout(countdownToDestruction);
      element.style.display='block';
      document.querySelector('span#infoBox').style.display='none'; //remove the infobox
      let yPos=window.scrollY;
      msnry.layout();
      //window.scroll(0, yPos);
      msnry.once('layoutComplete', function(){
        window.scroll(0, yPos); //go back to where we came from and know it for the first time
      });
    }
  }

  function completeDelete(element, id) {
    fetch('/mod',{
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      method: "POST",
      credentials: "include",
      body: `user=${_d.user}&id=${id}&action=DELETE`
      }).then(response=>{
        response.text().then(function(text){
        console.log(text);
    });
  });
  _d.userList[id.slice(2)]=1; //TODO that damn slice(2)
  msnry.remove(element);
  msnry.layout();
}

  function scaleByFactor(factor=1, id) { //scales div with ID by given factor (default 1)
    if (!id) {return false;}
    let ele=document.querySelector(`div.grid-item#${id}`);
    let bcr=ele.getBoundingClientRect();
    ele.style.width=bcr.width*factor;;
    ele.style.height=bcr.height*factor;
    let sizer=document.querySelector(`div.grid-sizer`); //TODO maybe change this smomewhere else dynamically
    sizer.style.width=bcr.width*factor;
    sizer.style.height=bcr.height*factor;
    (factor>1) ? ele.style.zIndex=1 : null; //pop it on top if it's big
  }

  function popModal(id) {
    if(!id) {return false;}
      //screen behind modal
        let screen=document.createElement('div');
        screen.id='modalScreen';
        screen.style.top=window.scrollY;
        screen.style.height=window.outerHeight+100;
        screen.style.width=window.outerWidth+100;
      //modal itself
        let modal=document.createElement('div');
        modal.id='imgModal';
        modal.dataset.id=id;
        let borderColor=imgDict[lastElement.id.slice(2)].imageInfo.color;
        //modal.style.maxHeight=window.innerHeight-10;
        modal.style.maxWidth=window.innerWidth-10;
        modal.style.height=window.innerHeight-40;
        modal.style.width=window.innerWidth-40;
        modal.style.border=`4px solid ${borderColor}`;
/*        modal.style.width=window.innerWidth*.9;
        modal.style.height=window.innerHeight*.9;
        modal.style.maxHeight=window.innerHeight-10;
        modal.style.maxWidth=window.innerWidth-10;*/
        let closeBox=document.createElement('div');
        closeBox.id='modalClose';
        closeBox.innerHTML=`X`;
        closeBox.addEventListener('click',killModal,true);
        modal.appendChild(closeBox);
        let img=new Image();
        img.onload=function() {
          modal.style.height=img.height;
          //console.log(img.height,img.width);
          document.body.append(screen);
          screenPopped=screen;
          document.body.append(modal);
          modalPopped=modal;
        }
        img.src=`${imgDict[id.slice(2)].imageInfo.urls.regular}`; //TODO that lopping off tho
        modal.style.height=window.innerHeight-10;//Math.min(modal.style.maxHeight.split("px")[0],img.height);
        modal.style.width=window.innerWidth-10;//Math.min(modal.style.maxHeight.split("px")[0],img.width);
        modal.style.top=Math.floor(window.scrollY+(window.innerHeight-modal.style.height.split("px")[0])/2);
        modal.style.left=Math.floor((window.scrollX+window.innerWidth-modal.style.width.split("px")[0])/2);
        modal.style.backgroundImage=`url(${img.src})`;
    }

    function recalculateModal() { //TODO add resizing!
      if(!modalPopped) { return false; }
      if(modalPopped) {
        let modal=document.querySelector('div#imgModal');
        let cbr=modal.getBoundingClientRect();
        /*if (window.scrollY > (modal.offsetTop + modal.offsetHeight)/2) {
          window.scroll(0, window.scrollY-(modal.offsetHeight));
        }*/
        console.log(window,scrollY)
        console.log((modal.offsetTop + modal.offsetHeight));
        console.dir(modal);
        console.log('w.sY',window.scrollY);
        let screen=document.querySelector('div#modalScreen');
        screen.style.top=window.scrollY;
        screen.style.left=window.scrollX;
        screen.style.height=modal.offsetTop+modal.offsetHeight+100; // a little cushion so we don't mistakenly mess this up
        screen.style.width=window.outerWidth+100;
      //  modal.style.maxHeight=window.innerHeight-10;
      //  modal.style.maxWidth=window.innerWidth-10;
        //modal.style.height=window.innerHeight-40;
        //modal.style.width=window.innerWidth-40;
        modal.style.left=Math.floor((window.scrollX+window.innerWidth-modal.style.width.split("px")[0])/2);
      }
    }

    function killModal() {
      gridStates[modalPopped.dataset.id].maximized=false;
      console.dir(modalPopped);
      console.dir(screenPopped);
      modalPopped.parentElement.removeChild(modalPopped);
      screenPopped.parentElement.removeChild(screenPopped);
      modalPopped=false;
    }

// example call:
//    toaster(event, '<a href="#" id="undo">You sure? Click->Undo</a>', 3, function()
    function toaster(e, message, duration=1, callback, offset=2) {
      let tea=document.createElement('div');
      tea.id='toast';
      tea.classList.add('toast');
      tea.innerHTML=message;
      //are we more than halfway to the right? if so, put the toast in the upper-right corner
      //are we more than halfway down? put the toast in the bottom bro
      ((e.offsetX-window.scrollX)>window.innerWidth/2) ? tea.style.right=offset : tea.style.left=offset;
      console.log(e.offsetY,window.innerHeight);
      ((e.offsetY-window.scrollY)>window.innerHeight/2) ? tea.style.bottom=offset : tea.style.top=offset;
      document.body.append(tea);
      setTimeout(function(){
        //eat the toast
        tea.parentElement.removeChild(tea);
      },duration*1000);
      (callback) ? callback(tea) : null;
    }
  }
