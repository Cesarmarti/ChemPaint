const {remote} = require('electron')
const {Menu, MenuItem} = remote
const Dialogs = require('dialogs')
const dialogs = Dialogs()

var known_vert = []
var known_horz = []
var precision = 20

var do_align = true
/*menu.append(new MenuItem({type: 'separator'}))
menu.append(new MenuItem({label: 'MenuItem2', type: 'checkbox', checked: true}))
menu.append(new MenuItem ({
   label: 'MenuItem3',
   click() {
      console.log('item 3 clicked')
   }
}))*/

// Prevent default action of right click in chromium. Replace with our menu.
window.addEventListener('contextmenu', (e) => {
   e.preventDefault()
   rightClickPosition = {x: e.x, y: e.y}

   const menu = new Menu()

   if(e.target.nodeName=='text' || e.target.nodeName=='tspan'){
      menu.append(new MenuItem ({
      label: 'Modify',
         click() { 
            console.log("modify"+e.target)
         }
      }))
      menu.append(new MenuItem ({
      label: 'Delete',
         click() { 
            deleteItem(e)
         }
      }))
   }else{
      menu.append(new MenuItem ({
      label: 'Node',
         click() { 
            readyNode(rightClickPosition.x,rightClickPosition.y)
         }
      }))
      menu.append(new MenuItem({label: 'Auto align', type: 'checkbox', checked: do_align,
         click(){
            do_align= !do_align
         }
      }))
   }
   
   menu.popup(remote.getCurrentWindow())
}, false)


function init(){
  
}

function deleteItem(e){
   let ele;
   if (e.target.nodeName!='text')
      ele = e.target.parentElement
   else
      ele = e.target

   //treba se v strukturi tole postimat
   //pa cekirat ce je se kksen node na tej liniji

   ele.parentNode.removeChild(ele);
}

function alignX(x){
   if(!do_align)
      return x
   var close_horz = -1
   for (ele in known_horz){
      if(Math.abs(known_horz[ele]-x)<precision){
         close_horz = known_horz[ele]
         break;
      }
   }
   if(close_horz!=-1){
      x = close_horz
      return x
   }else{
      known_horz.push(x)
      return x
   }
}

function alignY(y){
   if(!do_align)
      return y
   var close_vert = -1
   for (ele in known_vert){
      if(Math.abs(known_vert[ele]-y)<precision){
         close_vert = known_vert[ele]
         break;
      }
   }
   if(close_vert!=-1){
      y = close_vert
      return y
   }else{
      known_vert.push(y)
      return y
   }
}

function addNode(x,y,formula){
   dolzina = formula.length
   offset = 0;
   const image_svg = document.getElementById("svg_image");
   var svg_ele = document.createElementNS('http://www.w3.org/2000/svg',"text")

   x = alignX(x);
   
   svg_ele.setAttribute("x", x+"px");
   svg_ele.setAttribute("class","small_font")
   //splitamo po stevilkah
   chars = formula.split(/([0-9]+)/)
   if(chars.length>1){
      temp_chars = []
      var i = 0 
      for(char in chars){
         if(chars[char]!=''){
            temp_chars[i] = chars[char]
            i++
         }
      }
      chars = temp_chars
      for(number in chars){
         var digit = chars[number]
         var tsp = document.createElementNS('http://www.w3.org/2000/svg',"tspan")
         tsp.innerHTML = digit
         if(!isNaN(digit)){
            tsp.setAttribute("dy","5")  
            offset = 5
         }else{
            tsp.setAttribute("dy","-5")
         }
         svg_ele.appendChild(tsp);
      }
   }else{ 
      svg_ele.innerHTML  = formula
   }
   y = alignY(y)+offset;
   //svg_ele.addEventListener("click",deleteItself)
   //svg_ele.onclick = optionsPanel
   svg_ele.setAttribute("y", y+"px");
   /*svg_ele.setAttribute("cx", left+"px");
   svg_ele.setAttribute("cy", top+"px");
   svg_ele.setAttribute("r", "20");
   svg_ele.setAttribute("stroke", "green");
   svg_ele.setAttribute("stroke-width", "1px");*/

   image_svg.appendChild(svg_ele)
}
function readyNode(x,y){
   dialogs.prompt('Enter formula', ok => {
      var formula =  ok
      if(formula!="" && typeof formula !== 'undefined')
         addNode(x,y,formula)               
   });
}


//console.log(remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds())
init()



