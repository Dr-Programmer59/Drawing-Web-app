import React, {useEffect, useRef, useState, Fragment, useLayoutEffect} from 'react'
import {fabric} from 'fabric'
import { SketchPicker } from 'react-color';
import getStroke from "perfect-freehand";
import io from 'socket.io-client';
import './style.css';
import {CopyToClipboard} from 'react-copy-to-clipboard';



import {FaFont, FaFolderOpen, FaUserFriends} from 'react-icons/fa';
import {GrMenu, GrClose, GrPowerReset} from 'react-icons/gr';
import {BsSquare, BsTriangle, BsCircle, BsPencil} from 'react-icons/bs';
import {AiOutlineArrowRight,AiOutlineSelect,AiOutlineZoomOut,AiOutlineZoomIn} from 'react-icons/ai';
import {HiOutlineMinus} from 'react-icons/hi';
import {RiGalleryFill} from 'react-icons/ri';
import {CgShapeRhombus, CgColorPicker} from 'react-icons/cg';
import {MdDelete, MdSave} from 'react-icons/md';
import {ImExit,ImUndo,ImRedo} from 'react-icons/im';
import {FiShare2} from 'react-icons/fi';
import { image } from "../home/Home";
import { useParams } from "react-router-dom";


const getSvgPathFromStroke = stroke => {
  if (!stroke.length) return "";
  let path = '';
  stroke.forEach(point => {
    point = point.join(' ');
    path += ' ' + point; 
  });

  return path;
};


let canvas;
let newLine;
let newRectangle;
let newCircle;
let drawing = false;
let tool = 'line';
let origX;
let origY;
let circleX1;
let color = 'black';
let strokeSize = 3;
let socket;
const FabricJSCanvas = () => {
  const [navActive, setNavActive] = useState(false);
  const [boxColor, setBoxColor] = useState('black');
  const [strokeBoxSize, setStrokeBoxSize] = useState(3);
  const [colorBoxOpen, setColorBoxOpen] = useState(false);
  const [strokeActive, setStrokeActive] = useState(false);
  const [userId, setUserId] = useState('');
  const sizeList = [1,2,3,4,5,6,7,8,9,10];
  const canvasRef = useRef(null);
  const [myId, setMyId] = useState('');
  const [user, setUser] = useState('');
  const [data, setData] = useState([]);
  const {socketId} = useParams();
  const serverUrl = 'http://localhost:4000/';

  const onDraw = () => {
    const elements = canvas.getObjects()
    if(socketId){
      socket.emit('onDraw',{userId: socketId,data: elements});
    }else{
      socket.emit('onDraw',{userId: user,data: elements});
    }
  }

  useEffect(() => {
    socket = io(serverUrl,{transports: ['websocket']});
    socket.on('connect',() => {
      setMyId(socket.id);
      if(socketId){
        const name = window.prompt('Please Enter Your Name') || 'unknown';
        socket.emit('getElements',{userId: socketId, myId: socket.id, userName: name});
      }
    });

    socket.on('getElements',({Id,userName:Name}) => {
      window.alert(`${Name} is connected`)
      setUser(Id);
      const elements = canvas.getObjects();
      socket.emit('sendElements',{myId: Id, elements});
    });

    socket.on('revieveElement',({elements:userElements}) => {
      console.log(userElements);
      setData([...userElements]);
    });

    socket.on('onDraw',({data: userData}) => {
      console.log(userData);
      setData([...userData]);
    });

    return () => {
      socket.off();
    }

  },[]);

  useLayoutEffect(() => {
    const options = {
      width: window.innerWidth,
      height: window.innerHeight,
      selection: false,
    }
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, window.innerWidth, window.innerWidth);

    canvas = new fabric.Canvas(canvasRef.current,options);
    canvas.on('mouse:wheel', function(opt) {
      var delta = opt.e.deltaY;
      var zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      canvas.setWidth(canvas.getWidth() + 10);
      canvas.setHeight(canvas.getHeight() + 10);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    if(image){
      fabric.Image.fromURL(image,function(img){
        img.set('left',window.innerWidth/3).set('top',window.innerHeight/3)
        canvas.add(img);
        canvas.requestRenderAll();
      });
    }
    if(data.length !== 0){
        data.forEach(({type,width,height,top,left,stroke,strokeWidth,fill,radius,angle,x1,x2,y1,y2,path,src,scaleX,scaleY,skewX,skewY}) => {
          switch(type){
            case 'rect':
              newRectangle = new fabric.Rect({
                width,
                height,
                top,
                left,
                stroke,
                strokeWidth,
                fill,
                angle,
                scaleX,scaleY,skewX,skewY
              });
              canvas.add(newRectangle);
              canvas.requestRenderAll();
              break;
            case "circle":
              newCircle = new fabric.Circle({
                left,
                top,
                radius,
                stroke,
                strokeWidth,
                fill,
                angle,
                scaleX,scaleY,skewX,skewY
              });
              canvas.add(newCircle);
              canvas.requestRenderAll();
              break;
            case 'line':
              newLine = new fabric.Line([left,top,width+left,height+top],{
                stroke,
                strokeWidth,
                angle,
                scaleX,scaleY,skewX,skewY
              });
              canvas.add(newLine);
              canvas.requestRenderAll();
              break;
            case 'path':
              const stroke22 = getSvgPathFromStroke(path);
              const pencil = new fabric.Path(stroke22,{
                stroke,
                strokeWidth,
                angle,
                fill: 'transparent',
                scaleX,scaleY,skewX,skewY
              });
              canvas.add(pencil);
              canvas.requestRenderAll();
              break;
            case "image":
              console.log(width, height)
              fabric.Image.fromURL(src,function(img){
                // img.set('left',left).set('top',top).set('height',height).set('width',width).set('angle',angle);
                img.set({left,top,width,height,angle,scaleX,scaleY,skewX,skewY})
                canvas.add(img);
                canvas.requestRenderAll();
              });
              break;
          }
        });
    }
    return () => {
      canvas.dispose()
    }

  }, [data]);

  const handelPencil = () => {
    canvas.off('mouse:down',handleMouseDown);
    canvas.off('mouse:move',handleMouseMove);
    canvas.off('mouse:up',handleMouseUp);
    canvas.isDrawingMode = true;
    setStrokeActive(!strokeActive);
    tool = 'pencil';
  }

  const handlerSelect = () => {
    canvas.selection = true;
    canvas.off('mouse:down',handleMouseDown);
    canvas.off('mouse:move',handleMouseMove);
    canvas.off('mouse:up',handleMouseUp);
    canvas.isDrawingMode = false;
    tool = 'selection';
  }

  const toolHandler = (toolName) => {
    tool = toolName;
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.on('mouse:down',handleMouseDown);
    canvas.on('mouse:move',handleMouseMove);
    canvas.on('mouse:up',handleMouseUp);
  }

  function handleMouseDown(o){
    const pointer = canvas.getPointer(o.e);
    drawing = true;
    if(tool == 'line'){
      console.log(pointer);
      newLine = new fabric.Line([pointer.x, pointer.y ,pointer.x, pointer.y],{
        stroke: color,
        strokeWidth: 3
      });
      canvas.add(newLine);
      canvas.requestRenderAll();
    }else if(tool == 'rectangle'){
      origX = pointer.x;
      origY = pointer.y;
      newRectangle = new fabric.Rect({
        width: 0,
        height: 0,
        top: pointer.y,
        left: pointer.x,
        stroke: color,
        strokeWidth: 3,
        fill: 'transparent'
      });
      canvas.add(newRectangle);
      canvas.requestRenderAll();
    }else if(tool == 'circle'){
      circleX1 = pointer.x;
      newCircle = new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 0,
        stroke: color,
        strokeWidth: 3,
        fill: 'transparent'
      });
      canvas.add(newCircle);
      canvas.requestRenderAll();
      canvas.selection = false;
    }
  };

  function handleMouseMove(o){
    const pointer = canvas.getPointer(o.e);
    if(!drawing){
      return false
    }

    if(tool == 'line'){
      console.log(pointer)
      newLine.set({
        x2: pointer.x,
        y2: pointer.y
      });
    }else if(tool == 'rectangle'){
      let x = Math.min(pointer.x, origX);
      let y = Math.min(pointer.y, origY);
      let w = Math.abs(origX - pointer.x);
      let h = Math.abs(origY - pointer.y);
      newRectangle.set('top',y).set('left',x).set('height',h).set('width',w)
    }else if(tool == 'circle'){
      newCircle.set('radius',Math.abs(pointer.x - circleX1));
    }
    canvas.requestRenderAll();
  };

  const handleMouseUp = event => {
    drawing = false;
  };

  const handleZoomIn = () => {
    canvas.setZoom(canvas.getZoom() + 0.1, canvas.getZoom() + 0.1);
    canvas.setWidth(canvas.getWidth() + 80);
    canvas.setHeight(canvas.getHeight() + 80);
  }

  const handleZoomOut = () => {
    canvas.setZoom(canvas.getZoom() - 0.1, canvas.getZoom() - 0.1);
  }

  const handleZoomReset = () => {
    canvas.setZoom(1,1);
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
  }

  const handleColor = (c) => {
    setBoxColor(c.hex);
    color = c.hex;
    canvas.freeDrawingBrush.color = c.hex;
  }

  const handleStroke = (e) => {
    strokeSize = e.target.value;
    setStrokeBoxSize(e.target.value);
    canvas.freeDrawingBrush.width = e.target.value;
  }

   // bg image handler 
  const readFileSync = (file) => {
        return new Promise((res,rej) => {
            let reader = new FileReader();
            reader.onload = e => {
                    const data = atob(e.target.result.replace(/.*base64,/,''));
                    res(data);
            }
            reader.onerror = err => {
                rej(err);
            }
            reader.readAsDataURL(file);
        })
    }

    const imageToBase64 = (file) => {
        return new Promise((res,rej) => {
            const reader = new FileReader();
            reader.onload = () => {
                if(reader.readyState === 2){
                    res(reader.result);
                }
            }
            reader.readAsDataURL(file);
        })
    }

    async function onUpload(e) {
        const file = e.target.files[0];
        let fileExtension = file.name.split('.');
        fileExtension = fileExtension[fileExtension.length -1];
        if(fileExtension !== 'pdf'){
            const imageLoad = await imageToBase64(file);
            if(imageLoad){
              fabric.Image.fromURL(imageLoad,function(img){
                img.set('left',window.innerWidth/3).set('top',window.innerHeight/3)
                canvas.add(img);
                canvas.requestRenderAll();
              });
            }
            return
        }

        const data = await readFileSync(file);
        renderPDF(data);
      }
       
      
      async function renderPDF(data) {
        try{
            const pdf = await window.pdfjs.getDocument({data}).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({scale: 2});
            const Dcanvas = document.createElement('canvas');
            const canvasContext = Dcanvas.getContext('2d');
            Dcanvas.height = viewport.height;
            Dcanvas.width = viewport.width;
            await page.render({canvasContext, viewport}).promise;
            const firstImage = Dcanvas.toDataURL('image/png');
            if(firstImage){
              fabric.Image.fromURL(firstImage,function(img){
                img.set('left',window.innerWidth/3).set('top',window.innerHeight/3)
                canvas.add(img);
                canvas.requestRenderAll();
              });
            }
        }catch(err){
            console.log(err.message)
        }   
    }

    const check = () => {
      // const eleme = [];
      // canvas.getObjects().forEach((ele) => {
      //   // console.log(ele);
      //   eleme.push(ele);
      //   canvas.add(ele);
      //   canvas.requestRenderAll();
      // })
      // console.log(eleme);
      // eleme.forEach(ele => {
      //   canvas.add(ele);
      //   canvas.requestRenderAll();
      // })

      // const element = canvas.getObjects();
      // console.log(element);
      // element.forEach(ele => {
      //   canvas.add(ele);
      //   canvas.requestRenderAll();
      // });
    }

  return (
  <>
    <div className='box' onMouseMove={() => onDraw()}>
      <nav className={`left_nav ${navActive ? 'active': ''}`}>
            <div className='buttons'>
                <button onClick={check}><ImUndo/></button>
                <button><ImRedo/></button>
               

                <button onClick={handleZoomIn}><AiOutlineZoomIn/></button>
                <button onClick={handleZoomOut}><AiOutlineZoomOut/></button>
                <button onClick={handleZoomReset}><GrPowerReset/></button>
                {
                  !socketId &&
                  <CopyToClipboard text={`${window.location.href}/${myId}`}>
                    <button title='copy share link'><FiShare2/></button>
                  </CopyToClipboard>
                }
            </div>
        </nav>
        {   navActive
            ?
            <span className='menu'><GrClose onClick={() => setNavActive(!navActive)}/></span>
            :
            <span className='menu'><GrMenu onClick={() => setNavActive(!navActive)}/></span>
        }
        <nav className='top_nav'>
            <button 
             id="rectangle"
             onClick={() => toolHandler("rectangle")}
            ><BsSquare/></button>

            <button
            id="circle"
             onClick={() => toolHandler("circle")}
            ><BsCircle/></button>
            <button
            id="selection"
            onClick={handlerSelect}
            ><AiOutlineSelect/></button>
            <button
            id="line" onClick={() => toolHandler('line')}
            ><HiOutlineMinus/></button>
            <button
            id="pencil"
            onClick={handelPencil} 
            ><BsPencil/>
            </button>
            {
              strokeActive &&
              <div className='stroke_box flex_d_col'>
                  <label >
                    Stroke Width
                  </label>
                  <input type='text' placeholder='stroke width' list='size' value={strokeBoxSize} onChange={handleStroke}/>
                  <datalist id='size'>
                      {
                        sizeList.map((size,i) => <Fragment key={i}><option value={size}/></Fragment>)
                      }
                  </datalist>
              </div>
            }
            <button onClick={() => setColorBoxOpen(!colorBoxOpen)}><CgColorPicker/></button>
            {
              colorBoxOpen &&
              <div className='color_picker stroke_box'>
                <SketchPicker color={boxColor}  onChangeComplete={handleColor} defaultValue='#452135'/>
              </div>
            }
            <input type='file' style={{display: 'none'}} id='chooseFile' onChange={onUpload}/>
            <button><label htmlFor='chooseFile' ><RiGalleryFill/></label></button>
      </nav>
      <canvas
            id="canvas"
            ref={canvasRef}
            style={{overflow: 'auto'}}
          >
      </canvas>
      </div>
  </>);
}
export default FabricJSCanvas;