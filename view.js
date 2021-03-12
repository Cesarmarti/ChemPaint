const {remote} = require('electron')
const {Menu, MenuItem} = remote
const Dialogs = require('dialogs')
const dialogs = Dialogs()
const {ipcRenderer} = require('electron');
const fs = require('fs');

var known_vert = []
var known_horz = []
var precision = 40

var do_align = true

//structure data
var nodes = new Map()
var connections = new Map()
var node_index = 1;
var conn_index = 1;

//connection making data
var second_click = false
var source_id = 0;
var conn_offset = 10;
var conn_gap = 4;

//snap align
var snap_align = true
var conn_length = -1
var snap_precision = 40

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
      menu.append(new MenuItem({label: 'Snap align', type: 'checkbox', checked: snap_align,
         click(){
            snap_align= !snap_align
         }
      }))
   }
   
   menu.popup(remote.getCurrentWindow())
}, false)

ipcRenderer.on('getImage', (event, data) => {
   var svg_ele = document.getElementById("svg_image").cloneNode(true)
   var bounds = remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds()
   svg_ele.setAttribute("width",bounds.width)
   svg_ele.setAttribute("height",bounds.height)
   var data_image = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
   var s = new XMLSerializer();
   var data_image = data_image + s.serializeToString(svg_ele);
   fs.appendFileSync(data+".svg", data_image);
});


function getMousePos(e) {
    return {x:e.clientX,y:e.clientY};
}

document.onmousemove=function(e) {
    var mousecoords = getMousePos(e);
    if(second_click){
      var line = document.getElementById("pointerLine")
      line.setAttribute('x2',mousecoords.x-10)
      line.setAttribute('y2',mousecoords.y-10)
    }
    //console.log(mousecoords.x+" | "+mousecoords.y)
};

document.onkeydown = function(evt) {
   evt = evt || window.event;
   var isEscape = false;
   if ("key" in evt) {
      isEscape = (evt.key === "Escape" || evt.key === "Esc");
   } else {
      isEscape = (evt.keyCode === 27);
   }
   if (isEscape) {
      if(second_click){
         second_click = !second_click
         source_id = ""
         stopTrack()
      }
      
   }
};

function startTrack(ele){
   const image_svg = document.getElementById("svg_image");
   var line = document.createElementNS('http://www.w3.org/2000/svg',"line");
   var x = parseInt(ele.getAttribute('x').replace("px",""))+Math.floor(ele.getBoundingClientRect().width/2)
   var y = parseInt(ele.getAttribute('y').replace("px",""))-Math.floor(ele.getBoundingClientRect().height/2)
   line.setAttribute("x1",x)
   line.setAttribute("y1",y)
   line.setAttribute("x2",x)
   line.setAttribute("y2",y)
   line.setAttribute("style","stroke:yellow;stroke-width:5")
   line.setAttribute("id","pointerLine")
   image_svg.appendChild(line)
}
function stopTrack(){
   var ele = document.getElementById("pointerLine")
   ele.parentNode.removeChild(ele)
}

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
   var id = ele.id
   //get all connections, delete those, delete same connections in other node
   var node = nodes.get(id)
   node.forDelete = true
   nodes.set(id,node)
   var i = 0;
   for(i = 0;i<node.top.length;i++){
      deleteConn(node.top[i])
   }
   for(i = 0;i<node.bot.length;i++){
      deleteConn(node.bot[i])
   }
   for(i = 0;i<node.left.length;i++){
      deleteConn(node.left[i])
   }
   for(i = 0;i<node.right.length;i++){
      deleteConn(node.right[i])
   }

   nodes.delete(id)

   if(nodes.size<=1)
      conn_length = -1


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

function snapAlign(x,y){
   if(conn_length==-1 || !snapAlign)
      return x
   nodes.forEach(function(value, key, map){
      if(value.y!=y)
         return
      //right
      if((x-value.x)>0 && x-value.x<conn_length+snap_precision){
         x = value.x+conn_length
      }
      else if((value.x-x)>0 && value.x-x<conn_length+snap_precision){
         x = value.x-conn_length
      }

   })
   var is_in = false
   for(var i = 0;i<known_horz.length;i++){
      if(known_horz[i]==x)
         is_in = true
   }
   if(!is_in){
      known_horz.push(x)
   }

   return x
}

function snapAlignY(y,x){
   if(conn_length==-1 || !snapAlign)
      return y
   nodes.forEach(function(value, key, map){
      if(value.x!=x)
         return
      //down
      if((y-value.y)>0 && y-value.y<conn_length+snap_precision){
         y = value.y+(conn_length)
      }
      else if((value.y-y)>0 && value.y-y<conn_length+snap_precision){
         y = value.y-(conn_length)
      }

   })

   var is_in = false
   for(var i = 0;i<known_vert.length;i++){
      if(known_vert[i]==y)
         is_in = true
   }
   if(!is_in){
      known_vert.push(y)
   }
   return y
}


function addNode(x,y,formula){
   dolzina = formula.length
   offset = 0;
   const image_svg = document.getElementById("svg_image");
   var svg_ele = document.createElementNS('http://www.w3.org/2000/svg',"text")
   x = alignX(x);
   

   svg_ele.setAttribute("style","font: 15px sans-serif; fill:black;")

   var node_id = "n_"+node_index;
   svg_ele.setAttribute("id",node_id)
   node_index++;
   
   //split formula

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
            offset = 6
         }else{
            tsp.setAttribute("dy","-5")
         }
         svg_ele.appendChild(tsp);
      }
   }else{ 
      svg_ele.innerHTML  = formula
   }
   

   image_svg.appendChild(svg_ele)

   var ele_width = svg_ele.getBoundingClientRect().width;
   

   var ele_height = svg_ele.getBoundingClientRect().height;
   y = alignY(y)
   x = snapAlign(x,y);

   y = snapAlignY(y,x);
   y = y+offset;
   svg_ele.addEventListener("click",addConnection)

   svg_ele.setAttribute("x", x-Math.floor(ele_width/2)+"px");
   svg_ele.setAttribute("y", y-Math.floor(ele_height/2)+"px");

   nodes.set(node_id,{id:node_id,type:"text",top:[],bot:[],left:[],right:[],forDelete:false,'x':x,'y':y})
   //check if new allign distance
   if(nodes.size==2){
      var i = 0;
      var sTa;
      var eNd;
      nodes.forEach(function(value, key, map){
         if(i==0){
            sTa = value
         }else{
            eNd = value;
         }
         i++;

      })
      var x1 = sTa.x
      var y1 = sTa.y
      var x2 = eNd.x
      var y2 = eNd.y
      if(x1-x2==0){
         conn_length = Math.abs(y1-y2)
      }else{
         conn_length = Math.abs(x1-x2)
      }
   }
}
function readyNode(x,y){
   dialogs.prompt('Enter formula', ok => {
      var formula =  ok
      if(formula!="" && typeof formula !== 'undefined')
         addNode(x,y,formula)               
   });
}

function addConnection(e){
   let ele;
   if (e.target.nodeName!='text')
      ele = e.target.parentElement
   else
      ele = e.target

   if(second_click && ele.id!=source_id){
      makeConnection(source_id,ele.id)
      second_click = !second_click
      source_id = ""
      stopTrack()
   }else if(second_click && ele.id==source_id){
      second_click = !second_click
      source_id = ""
      stopTrack()
   }else{
      source_id = ele.id
      second_click = !second_click
      startTrack(ele)
   }
}

function clearCons(n_id,c_id){
   var node = nodes.get(n_id)

   var index = node.top.indexOf(c_id);
   if (index > -1) {
      node.top.splice(index, 1);
   }

   index = node.bot.indexOf(c_id);
   if (index > -1) {
      node.bot.splice(index, 1);
   }

   index = node.left.indexOf(c_id);
   if (index > -1) {
      node.left.splice(index, 1);
   }
   index = node.right.indexOf(c_id);
   if (index > -1) {
      node.right.splice(index, 1);
   }
   nodes.set(n_id,node)
}

function deleteConnection(e){
   let ele = e.target
   var c_id = ele.getAttribute('id')
   deleteConn(c_id)
}

function deleteConn(c_id){
   var conn = connections.get(c_id)
   var src_id = conn.src
   var dest_id = conn.dst
   var src_ele = nodes.get(src_id)
   var dest_ele = nodes.get(dest_id)
   //cleanup
   if(!src_ele.forDelete){
      clearCons(src_id,c_id)
      rebalanceNode(src_id)
   }
   if(!dest_ele.forDelete){
      clearCons(dest_id,c_id)
      rebalanceNode(dest_id)
   }
   connections.delete(c_id)
   var ele = document.getElementById(c_id)
   ele.parentNode.removeChild(ele);
}

function connectionRebalance(table,node_id,type){
   var startOffset = table.length/2-0.5
   var node_ele = document.getElementById(node_id)
   if(type=='x'){
      var startX = parseInt(node_ele.getAttribute('x').replace("px",""))
      var widthPol = Math.floor(node_ele.getBoundingClientRect().width/2)
      var start = startX+widthPol-startOffset*conn_gap;
      for(var i = 0;i<table.length;i++){
         var conn = table[i]
         var conn_item = connections.get(conn)
         var conn_ele = document.getElementById(conn)
         if(conn_item.src==node_id){
            //take left coords
            conn_ele.setAttribute('x1',start)
         }else{
            //take right coords
            conn_ele.setAttribute('x2',start)
         }
         start+=conn_gap
      }
   }else{
      var startY = parseInt(node_ele.getAttribute('y').replace("px",""))
      var heightPol = Math.floor(node_ele.getBoundingClientRect().height/2)
      var start = startY-heightPol-startOffset*conn_gap;
      for(var i = 0;i<table.length;i++){
         var conn = table[i]
         var conn_item = connections.get(conn)
         var conn_ele = document.getElementById(conn)
         if(conn_item.src==node_id){
            //take left coords
            conn_ele.setAttribute('y1',start)
         }else{
            //take right coords
            conn_ele.setAttribute('y2',start)
         }
         start+=conn_gap
      }
   }
   
}

function rebalanceNode(id){
   var node = nodes.get(id)
   //go through top,bot,left,right
   if(node.top.length!=0)
      connectionRebalance(node.top,id,'x')
   if(node.bot.length!=0)
      connectionRebalance(node.bot,id,'x')
   if(node.left.length!=0)
      connectionRebalance(node.left,id,'y')
   if(node.right.length!=0)
      connectionRebalance(node.right,id,'y')
}

function makeConnection(src_id,dest_id){
   var node_offset = 10
   src_node = document.getElementById(src_id)
   dst_node = document.getElementById(dest_id)
   var src_rect = src_node.getBoundingClientRect();
   var dst_rect = dst_node.getBoundingClientRect();
   //get position where to make connections
   s_x = src_node.getAttribute('x');
   d_x = dst_node.getAttribute('x');
   s_x = parseInt(s_x.replace("px",""))
   d_x = parseInt(d_x.replace("px",""))
   var dir_x = s_x - d_x

   s_y = src_node.getAttribute('y');
   d_y = dst_node.getAttribute('y');
   s_y = parseInt(s_y.replace("px",""))
   d_y = parseInt(d_y.replace("px",""))
   var dir_y = s_y - d_y

   const image_svg = document.getElementById("svg_image");

   if(Math.abs(dir_x)>Math.abs(dir_y)){

      //left-right

      var dir = 0
      if(dir_x<0){
         dir = 1
      }
      var line = document.createElementNS('http://www.w3.org/2000/svg',"line")
      var offsety_s = Math.floor((src_rect.height)/2)
      var offsety_d = Math.floor((dst_rect.height)/2)
      var offset1 = 0;
      var offset2 = 0;
      if(dir==1){
         offset1 = src_rect.width + conn_offset
         offset2 = - conn_offset
      }else{
         offset2 = dst_rect.width+conn_offset
         offset1 = - conn_offset
      }
      line.setAttribute("x1",s_x + offset1)
      line.setAttribute("y1",s_y-offsety_s)
      line.setAttribute("x2",d_x + offset2)
      line.setAttribute("y2",d_y-offsety_d)
      line.setAttribute("style","stroke:black;stroke-width:1")
      var conn_id = "c_"+conn_index
      line.setAttribute("id","c_"+conn_index)
      conn_index = conn_index+1;
      var sr_ind = src_node.getAttribute('id')
      var dst_ind = dst_node.getAttribute('id')
      connections.set(conn_id,{'src':sr_ind,'dst':dst_ind})

      //sett links in nodes
      var sr = nodes.get(sr_ind)
      var dt = nodes.get(dst_ind)
      if(dir==1){
         //left
         sr.right.push(conn_id)
         dt.left.push(conn_id)
      }else{
         //right
         sr.left.push(conn_id)
         dt.right.push(conn_id)
      }
      nodes.set(sr_ind,sr)
      nodes.set(dst_ind,dt)

      line.addEventListener("click",deleteConnection)

      image_svg.appendChild(line)
   }else{
      //up-down

      var dir = 0
      if(dir_y<0){
         dir = 1
      }
      var line = document.createElementNS('http://www.w3.org/2000/svg',"line")
      var offsetx_s = Math.floor((src_rect.width)/2)
      var offsetx_d = Math.floor((dst_rect.width)/2)
      var offset1 = 0;
      var offset2 = 0;
      if(dir==1){
         //down
         offset1 = + conn_offset
         offset2 = - dst_rect.height 
      }else{
         //up
         offset2 = +conn_offset
         offset1 = - src_rect.height 
      }
      line.setAttribute("x1",s_x + offsetx_s)
      line.setAttribute("y1",s_y+offset1)
      line.setAttribute("x2",d_x + offsetx_d)
      line.setAttribute("y2",d_y+offset2)
      line.setAttribute("style","stroke:black;stroke-width:2")
      var conn_id = "c_"+conn_index
      line.setAttribute("id","c_"+conn_index)
      conn_index = conn_index+1;
      var sr_ind = src_node.getAttribute('id')
      var dst_ind = dst_node.getAttribute('id')
      connections.set(conn_id,{'src':sr_ind,'dst':dst_ind})

      //sett links in nodes
      var sr = nodes.get(sr_ind)
      var dt = nodes.get(dst_ind)
      if(dir==1){
         //down
         sr.bot.push(conn_id)
         dt.top.push(conn_id)
      }else{
         //up
         sr.top.push(conn_id)
         dt.bot.push(conn_id)
      }

      nodes.set(sr_ind,sr)
      nodes.set(dst_ind,dt)

      line.addEventListener("click",deleteConnection)

      image_svg.appendChild(line)
   }

   //rebalance nodes
   rebalanceNode(src_id)
   rebalanceNode(dest_id)
}  

//console.log(remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds())
init()



