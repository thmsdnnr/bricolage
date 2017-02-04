/*NOTES:
-internally we prepend IDs with Z_ so numeric beginning IDs are valid CSS selectors
->hence the .slice(2) call when comparing page IDs with database IDs
->IDs are rendered on the page in the dataset-text attribute and accessed on click events through
e.target.dataset.text
 */
window.onload = function() {
  let _d=window.INITIAL_STATE;
  let imgDict=_d.dict;
  let q=window.INITIAL_STATE.query;
  let gridStates={};
  let brokenImages={};
  let modalPopped=false;
  let screenPopped=false;
  let yScrollModalReturn;

  function showLessMoreResults(query,page) {
    //called with query and current page, e.g., RESTOFURL/s/?q=${query}&p=${page}
    let numTotalPages=parseInt(q.totalPages);
    let numResultPage=parseInt(q.resultPage);
    let numImages=parseInt(q.numImages);
    let d = document.querySelector('div#lessMore');
    if ((numResultPage>numTotalPages)||(numResultPage<1)) { //malformed request
      d.innerHTML='';
      return false;
    }
    if (numResultPage>1) { //display a LESS with href q.resultPage-1
      d.innerHTML+=`<a href="/s/?q=${query}&p=${parseInt(page)-1}" id="backResults"><< go backwards</a>`;
    }
    if (numResultPage<numTotalPages) { //display a MORE with href q.resultPage+1
        d.innerHTML+=` | <a href="/s/?q=${query}&p=${parseInt(page)+1}" id="forwardResults">go forwards >></a>`;
      }
    }

  var elem = document.querySelector('.grid');
  var msnry = new Masonry( elem, { //options
  itemSelector: '.grid-item',
  columnWidth: '.grid-sizer',
  percentPosition: true
  });

  imagesLoaded(elem).on('progress', function(instance, image){
    if (!image.isLoaded) {
      //if image does not load: update with placeholder, add to broken image list for tooltip
      image.img.src='/assets/images/logo.png';
      brokenImages[image.img.id]=1;
    }
  });

  imagesLoaded(elem).on('done', function() {
    msnry.layout(); //call after each image load
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
    if (gridStates[lastElement.id].broken) { return false; }
    if (lastElement&&!modalPopped) {
      let v=imgDict[lastElement.id.slice(2)];
      let u=v.imageInfo.user;
      let bgColor=v.imageInfo.color;
      let iBCR=document.querySelector(`img#${lastElement.id}`);
      let bcr=iBCR.getBoundingClientRect(); //TODO this works but fix
      let i=document.querySelector('span#infoBox');
      i.style.border=`5px inset ${bgColor}`;
      //clear existing content
      i.innerHTML=null;
      //if image is broken, don't display any hover thing
      //conditional control display based on maximized/minimized state
      if (gridStates[lastElement.id].minimized) {
        i.innerHTML+=`<div id="RGY"><div id="R" class="light" data-text="${lastElement.id}"></div><div id="G" class="light" data-text="${lastElement.id}"></div></div>`;
      }
      else {
        i.innerHTML+=`<div id="RGY"><div id="R" class="light" data-text="${lastElement.id}"></div><div id="Y" class="light" data-text="${lastElement.id}"></div><div id="G" class="light" data-text="${lastElement.id}"></div></div>`;
      }
      let img,name,location,portF;
      if (u.profile_image) {
        /*urls are like this: https://images.unsplash.com/profile-1469106 or this:
        https://images.unsplash.com/placeholder-avatars/extra-large.jpg?ixlib=rb-...
        We don't want to display placeholders, so parse url for 'profile' or 'placeholder' and act accordingly */
        let profImgType=u.profile_image.medium.split("https://images.unsplash.com/")[1].split("-")[0];
        (profImgType==='profile') ? img=`<img src="${u.profile_image.medium}" class="profileImage">` : img='';
      }
      (u.name) ? name=u.name : name='~';
      (u.portfolio_url) ? portF=`<a href="${u.portfolio_url}" target="_new">${img}${name}</a><br />` : portF=`${img}`;
      (u.location) ? location=`${u.location}` : location = '';

      if (_d.user&&!_d.userList[lastElement.id.slice(2)]) {
        i.innerHTML+=`<div id="addButton"><button id="addButton" data-text="${lastElement.id}" class="wave">ADD+ <3s: ${v.imageInfo.likes}</button></div>`;
      }

      i.innerHTML+=`<span id="boxCont"><div id="attribution"><div id="name" class="child">${portF}${location}</span>`;
      i.innerHTML+=`</div></span>`;
      i.classList.add('showTip');
      i.style.display='inline';
      i.style.top=bcr.top+padding;
      i.style.left=bcr.left+padding;
      i.style.width=bcr.width-padding*2;
      i.style.height=bcr.height-padding*2;
      i.style.color=whatColorText(bgColor.slice(1)); //lop off the octothorpe e.g., #FFFFFF->FFFFFF
    }
  }

    function triggerTheMagic() { //add event listeners for scroll, click, and resize
      let divs=document.querySelectorAll('div.grid-item');
      divs.forEach((d)=>d.addEventListener('mouseover', handleMouse));
      let iBox=document.querySelector('span#infoBox'); //whole info attribution box
      iBox.addEventListener('click', handleDivClick);
      let modBox=document.querySelector('div#RGY'); //RGY is the close, minimize, maximize buttons at upper-left
      iBox.addEventListener('mouseover', handleModBox);
      iBox.addEventListener('mouseout', handleModBox);
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      setGridStates();
      if(q){ showLessMoreResults(q.query, q.resultPage); }
  }

  let handleScroll = debounce(function(e){
      (modalPopped) ? document.querySelector('span#infoBox').style.display='none': updateToolTip();
      recalculateModal();
    },10,true);

  function handleResize(e) {
    (modalPopped) ? document.querySelector('span#infoBox').style.display='none': updateToolTip();
    recalculateModal();
  }

  function setGridStates() {
    let elements=document.querySelectorAll(`div.grid-item`);
    elements.forEach((ele)=>{
      let bcr=ele.getBoundingClientRect();
      let broken;
      (brokenImages[ele.id]) ? broken=true : broken=false;
      gridStates[ele.id] = {'initialWidth':bcr.width,'initialHeight':bcr.height,'maximized':false,'minimized':false,
    broken:broken};
    });
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
      if (e.target.id==='G') { //MAXIMIZE
        if (gridStates[e.target.dataset.text].minimized) { //restore to original size
          scaleByFactor(2, e.target.dataset.text);
          gridStates[e.target.dataset.text].minimized=false;
          msnry.layout();
          updateToolTip();
        }
        else if (!gridStates[e.target.dataset.text].maximized) { //make it big!
            gridStates[e.target.dataset.text].maximized=true;
            popModal(e.target.dataset.text);
            updateToolTip();
          }
        }
      if (e.target.id==='Y') { //MINIMIZE
        if (!gridStates[e.target.dataset.text].minimized) {
          console.log('minimize');
          scaleByFactor(0.5, e.target.dataset.text);
          gridStates[e.target.dataset.text].minimized=true;
          updateToolTip();
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
      document.querySelector('span#infoBox').style.display='none';
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
        _d.userList[e.target.dataset.text.slice(2)]=1;
        console.log(_d.userList);
      });
    }
  }

  function undoDeletion(element, event) {
    //pop a toast with a link
    //add an event listener on click to redo
    //then setTimeout for element removal and call completeDelete
    element.style.display='none';
    let id=event.target.dataset.text;
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
  _d.userList[id.slice(2)]=1;
  msnry.remove(element);
  msnry.layout();
}

  function scaleByFactor(factor=1, id) { //scales div with ID by given factor (default 1)
    if (!id) {return false;}
    let ele=document.querySelector(`div.grid-item#${id}`);
    let bcr=ele.getBoundingClientRect();
    ele.style.width=bcr.width*factor;;
    ele.style.height=bcr.height*factor;
    let sizer=document.querySelector(`div.grid-sizer`);
    sizer.style.width=bcr.width*factor;
    sizer.style.height=bcr.height*factor;
    (factor>1) ? ele.style.zIndex=1 : null; //pop it on top if it's big
  }

  function popModal(id) {
    document.querySelector('span#infoBox').style.display='none'; //remove the infobox
    if(!id) {return false;}
    yScrollModalReturn=window.scrollY; //where to go when we return
      //screen behind modal
        let screen=document.createElement('div');
        screen.id='modalScreen';
        screen.style.top=0;
        screen.style.height=window.innerHeight+2400;
        screen.style.width=window.innerWidth;
      //modal itself
        let modal=document.createElement('div');
        let borderColor=imgDict[lastElement.id.slice(2)].imageInfo.color;
        modal.id='imgModal';
        modal.dataset.id=id;
        modal.style.top=0;
        modal.style.left=Math.floor(window.scrollX+(window.innerWidth-parseInt(modal.style.width))/2);
        modal.style.width=window.innerWidth-10;
        modal.style.border=`4px solid ${borderColor}`;

        let closeBox=document.createElement('div');
        closeBox.id='modalClose';
        closeBox.innerHTML=`X`;
        closeBox.addEventListener('click',killModal,true);
        modal.appendChild(closeBox);

        let img=new Image(); //load the maximized image for the div background
        img.onload=function() {
          modal.style.height=img.height;
          document.body.append(screen);
          screenPopped=screen;
          document.body.append(modal);
          window.scroll(0,0); //we scroll to the top so we only have to handle scrolling past the bottom of the modal
          modalPopped=modal;  //on modal close we restore window position by scrolling back to yScrollModalReturn
        }
        img.src=`${imgDict[id.slice(2)].imageInfo.urls.regular}`;
        modal.style.backgroundImage=`url(${img.src})`;
    }

    function recalculateModal() {
      if(!modalPopped) { return false; }
      if(modalPopped) {
        let modal=document.querySelector('div#imgModal');
        if (window.scrollY > (modal.offsetHeight-modal.offsetTop)) { //infinity scroll heh
          window.scroll(0,modal.style.top); //pop back to top if we've scrolled off screen while maximized image is up
        }
        let screen=document.querySelector('div#modalScreen');
        modal.style.width=window.innerWidth-10;
        screen.style.width=window.innerWidth;
        modal.style.left=Math.floor(window.scrollX+(window.innerWidth-parseInt(modal.style.width))/2);
      }
    }

    function killModal() {
      gridStates[modalPopped.dataset.id].maximized=false;
      modalPopped.parentElement.removeChild(modalPopped);
      screenPopped.parentElement.removeChild(screenPopped);
      document.querySelector('span#infoBox').style.display='none'; //remove the infobox
      modalPopped=false;
      window.scroll(0,yScrollModalReturn);
    }

    function toaster(e, message, duration=1, callback, offset=2) {
      // example call:
      //toaster(event, '<a href="#" id="undo">You sure? Click->Undo</a>', 3, callback(), offset from corner of screen
      let tea=document.createElement('div');
      tea.id='toast';
      tea.classList.add('toast');
      tea.innerHTML=message;
      //are we more than halfway to the right? if so, put the toast in the upper-right corner
      //are we more than halfway down? put the toast in the bottom bro
      ((e.offsetX-window.scrollX)>window.innerWidth/2) ? tea.style.right=offset : tea.style.left=offset;
      ((e.offsetY-window.scrollY)>window.innerHeight/2) ? tea.style.bottom=offset : tea.style.top=offset;
      document.body.append(tea);
      setTimeout(function(){ //eat the toast
        tea.parentElement.removeChild(tea);
      },duration*1000);
      (callback) ? callback(tea) : null;
    }

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
  }
