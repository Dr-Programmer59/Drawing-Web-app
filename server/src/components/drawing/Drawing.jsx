import React, { useEffect, useLayoutEffect, useRef, useState, Fragment } from "react";
import rough from "roughjs/bundled/rough.esm";
import getStroke from "perfect-freehand";
import io from 'socket.io-client';
import {CopyToClipboard} from 'react-copy-to-clipboard';
import { SketchPicker } from 'react-color'
import SweetAlert from 'react-bootstrap-sweetalert';
import {fabric} from 'fabric'


import './style.css';

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
const generator = rough.generator();

// const createElement = (id, x1, y1, x2, y2, type) => {
//   switch (type) {
//     case "line":
//     case "rectangle":
//       const roughElement =
//         type === "line"
//           ? generator.line(x1, y1, x2, y2,{stroke: 'red'})
//           : generator.rectangle(x1, y1, x2 - x1, y2 - y1);
//       return { id, x1, y1, x2, y2, type, roughElement };
//       case "circle":
//         const circleroughElement =
//           type === "line"
//             ? generator.line(x1, y1, x2, y2,{stroke: 'red'})
//             : generator.circle(x1, y1, x2 - x1, y2 - y1);
//         return { id, x1, y1, x2, y2, type, circleroughElement };
//     case "pencil":
//       return { id, type, points: [{ x: x1, y: y1 }] };
//     case "text":
//       return { id, type, x1, y1, x2, y2, text: "" };
//     default:
//       throw new Error(`Type not recognised: ${type}`);
//   }
// };

const nearPoint = (x, y, x1, y1, name) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

const onLine = (x1, y1, x2, y2, x, y, maxDistance = 1) => {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };
  const offset = distance(a, b) - (distance(a, c) + distance(b, c));
  return Math.abs(offset) < maxDistance ? "inside" : null;
};

const positionWithinElement = (x, y, element) => {
  const { type, x1, x2, y1, y2 } = element;
  switch (type) {
    case "line":
      const on = onLine(x1, y1, x2, y2, x, y);
      const start = nearPoint(x, y, x1, y1, "start");
      const end = nearPoint(x, y, x2, y2, "end");
      return start || end || on;
    case "rectangle":
      const topLeft = nearPoint(x, y, x1, y1, "tl");
      const topRight = nearPoint(x, y, x2, y1, "tr");
      const bottomLeft = nearPoint(x, y, x1, y2, "bl");
      const bottomRight = nearPoint(x, y, x2, y2, "br");
      const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
      return topLeft || topRight || bottomLeft || bottomRight || inside;
    case "circle":
        const CrtopLeft = nearPoint(x, y, x1, y1, "tl");
        const CrtopRight = nearPoint(x, y, x2, y1, "tr");
        const CrbottomLeft = nearPoint(x, y, x1, y2, "bl");
        const CrbottomRight = nearPoint(x, y, x2, y2, "br");
        const Crinside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
        return CrtopLeft || CrtopRight || CrbottomLeft || CrbottomRight || Crinside;
    case "pencil":
      const betweenAnyPoint = element.points.some((point, index) => {
        const nextPoint = element.points[index + 1];
        if (!nextPoint) return false;
        return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null;
      });
      return betweenAnyPoint ? "inside" : null;
    case "text":
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    default:
      throw new Error(`Type not recognised: ${type}`);
  }
};

const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const getElementAtPosition = (x, y, elements) => {
  return elements
    .map(element => ({ ...element, position: positionWithinElement(x, y, element) }))
    .find(element => element.position !== null);
};

const adjustElementCoordinates = element => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === "rectangle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }else if (type === "circle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }
  else {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
};

const cursorForPosition = position => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    default:
      return "move";
  }
};

const resizedCoordinates = (clientX, clientY, position, coordinates) => {
  const { x1, y1, x2, y2 } = coordinates;
  switch (position) {
    case "tl":
    case "start":
      return { x1: clientX, y1: clientY, x2, y2 };
    case "tr":
      return { x1, y1: clientY, x2: clientX, y2 };
    case "bl":
      return { x1: clientX, y1, x2, y2: clientY };
    case "br":
    case "end":
      return { x1, y1, x2: clientX, y2: clientY };
    default:
      return null; //should not really get here...
  }
};

const useHistory = initialState => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = (action, overwrite = false) => {
    const newState = typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex(prevState => prevState + 1);
    }
  };

  const undo = () => index > 0 && setIndex(prevState => prevState - 1);
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1);

  return [history[index], setState, undo, redo];
};

const getSvgPathFromStroke = stroke => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};

const drawElement = (roughCanvas, context, element,color) => {
  switch (element.type) {
    case "line":
    case "rectangle":
      roughCanvas.draw(element.roughElement);
      break;
    case "circle":
        roughCanvas.draw(element.circleroughElement);
        break;
    case "pencil":
      const stroke = getSvgPathFromStroke(getStroke(element.points));
      // context.fillStyle = color;
      context.fill(new Path2D(stroke));
      // context.lineTo(element.points.x,element.points.y);
      // context.stroke();
      break;
    case "text":
      context.textBaseline = "top";
      context.font = "24px sans-serif";
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      throw new Error(`Type not recognised: ${element.type}`);
  }
};

const adjustmentRequired = type => ["line", "rectangle","circle"].includes(type);



let socket;
let context;
const Drawing = () => {
  const [color, setColor] = useState('black');
  const [strokeSize, setStrokeSize] = useState(3);
  const [navActive, setNavActive] = useState(false);
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("text");
  const [selectedElement, setSelectedElement] = useState(null);
  const [strokeActive, setStrokeActive] = useState(false);
  const [colorBoxOpen, setColorBoxOpen] = useState(false);
  const [bgImage, setBgImage] = useState(image);
  const [confirm, setConfirm] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const textAreaRef = useRef();
  const canvasRef = useRef();
  const sizeList = [1,2,3,4,5,6,7,8,9,10];


  //socket io code
  const [myId, setMyId] = useState('');
  const [user, setUser] = useState('');
  const [sendDataUser, setSendDataUser] = useState([]);
  const {socketId} = useParams();
  const [data, setData] = useState([]);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const serverUrl = 'http://localhost:4000/';

  const sendData = () => {
   if(socketId){
     sendDataUser.forEach(id => id !== myId && socket.emit('onDraw',{userId: id, data: elements}));
   }else{
     user && user.forEach(id => socket.emit('onDraw',{userId: id, data: elements}));
   }
  }
  const getAllUser = () => {
    console.log('users list ',user)
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
      setNewUserName(Name);
      setConfirm(true);
        setUser(prevState => [...prevState,Id]);
        setNewUserId(Id);
    });

    socket.on('revieveElement',({elements:userElements,userList, bgImage:userBgImage}) => {
      setData([...userElements]);
      setSendDataUser([...userList,socketId]);
      // image = bgImage;
      setBgImage(userBgImage);
    });

    socket.on('newUserAdded',({newUserId: newUser,newUserName:Name}) => {
      // alert(`${Name} is connected`);
      setNewUserName(Name);
      setConfirm(true);
      setSendDataUser(prevState => [...prevState,newUser]);
    });

    socket.on('onDraw',({data: userData}) => {
      setData([...userData]);
    });

    return () => {
      socket.off();
    }

  },[]);


  const sendElements = () => {
    socket.emit('sendElements',{myId: newUserId, elements: [...elements], userList: user,bgImage: image});
    socket.emit('newUserAdded',{sendDataList: user,newUserId, newUserName});
  }


  useEffect(() => {
    if(newUserId){
      sendElements();
    }
  },[newUserId]);





// zoom in zoom out
  const zoomInHandler = () => {
    const newEle = elements.map((ele,i) => {
      if(ele.type == 'rectangle'){
        console.log(ele)
        const ince = 8
        ele = createElement(ele.id, ele.x1+ince, ele.y1+ince, ele.x2+ince, ele.y2+ince, ele.type);
      }
      return ele;
    });
    setElements(newEle);
  }

  const zoomOuthandler = () => {
    const newEle = elements.map((ele,i) => {
      if(ele.type == 'rectangle'){
        console.log(ele)
        const ince = 8
        ele = createElement(ele.id, ele.x1-ince, ele.y1-ince, ele.x2-ince, ele.y2-ince, ele.type);
      }
      return ele;
    });
    setElements(newEle);
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
        const data = await readFileSync(file);
        let fileExtension = file.name.split('.');
        fileExtension = fileExtension[fileExtension.length -1];
        if(fileExtension !== 'pdf'){
            const bg = await imageToBase64(file);
            setBgImage(bg);
            return
        }

        renderPDF(data);
      }
       
      
      async function renderPDF(data) {
        try{
            const pdf = await window.pdfjs.getDocument({data}).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({scale: 2});
            const canvas = document.createElement('canvas');
            const canvasContext = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({canvasContext, viewport}).promise;
            const firstImage = canvas.toDataURL('image/png');
            setBgImage(firstImage);
        }catch(err){
            image = null;
        }   
    }

  const createElement = (id, x1, y1, x2, y2, type) => {
    switch (type) {
      case "line":
      case "rectangle":
        const roughElement =
          type === "line"
            ? generator.line(x1, y1, x2, y2,{stroke: color, strokeWidth: strokeSize})
            : generator.rectangle(x1, y1, x2 - x1, y2 - y1,{stroke: color, strokeWidth: strokeSize,});
        return { id, x1, y1, x2, y2, type, roughElement };
        case "circle":
          const circleroughElement =
            type === "line"
              ? generator.line(x1, y1, x2, y2,{stroke: color, strokeWidth: strokeSize})
              : generator.circle(x1, y1, x2 - x1, {
                  stroke: color,
                  strokeWidth: strokeSize
                });

          return { id, x1, y1, x2, y2, type, circleroughElement };
      case "pencil":
        return { id, type, points: [{ x: x1, y: y1}] };
      case "text":
        return { id, type, x1, y1, x2, y2, text: "" };
      default:
        throw new Error(`Type not recognised: ${type}`);
    }
  };

  const pencilHandler = () => {
    setTool('pencil');
    setStrokeActive(!strokeActive);
  }

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    const roughCanvas = rough.canvas(canvas);
      try{
        elements.forEach(element => {
          if (action === "writing" && selectedElement.id === element.id) return;
          drawElement(roughCanvas, context, element, color);
        });
      }catch(err){
        console.log(err);
      }
     data && data.forEach(element => {
          if (action === "writing" && selectedElement.id === element.id) return;
          drawElement(roughCanvas, context, element, color);
        });

  }, [elements, action, selectedElement, data, zoom]);

  useEffect(() => {
    const undoRedoFunction = event => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener("keydown", undoRedoFunction);
    return () => {
      document.removeEventListener("keydown", undoRedoFunction);
    };
  }, [undo, redo]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (action === "writing") {
      textArea.focus();
      textArea.value = selectedElement.text;
    }
  }, [action, selectedElement]);

  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements];

    switch (type) {
      case "line":
      case "rectangle":
        elementsCopy[id] = createElement(id, x1, y1, x2, y2, type);
        break;
        case "circle":
            elementsCopy[id] = createElement(id, x1, y1, x2, y2, type);
            break;
      case "pencil":
        elementsCopy[id].points = [...elementsCopy[id].points, { x: x2, y: y2 }];
        break;
      case "text":
        const textWidth = document
          .getElementById("canvas")
          .getContext("2d")
          .measureText(options.text).width;
        const textHeight = 24;
        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type),
          text: options.text,
        };
        break;
        
      default:
        throw new Error(`Type not recognised: ${type}`);
    }

    setElements(elementsCopy, true);
  };

  const handleMouseDown = event => {
    if (action === "writing") return;

    const { clientX, clientY } = event;
    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        if (element.type === "pencil") {
          const xOffsets = element.points.map(point => clientX - point.x);
          const yOffsets = element.points.map(point => clientY - point.y);
          setSelectedElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ ...element, offsetX, offsetY });
        }
        setElements(prevState => prevState);

        if (element.position === "inside") {
          setAction("moving");
        } else {
          setAction("resizing");
        }
      }
    } else {
      const id = elements.length;
      const element = createElement(id, clientX, clientY, clientX, clientY, tool);
      setElements(prevState => [...prevState, element]);
      setSelectedElement(element);
      setAction(tool === "text" ? "writing" : "drawing");
    }
    sendData();
  };

  const handleMouseMove = event => {
    const { clientX, clientY } = event;

    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      event.target.style.cursor = element ? cursorForPosition(element.position) : "default";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving") {
      if (selectedElement.type === "pencil") {
        const newPoints = selectedElement.points.map((_, index) => ({
          x: clientX - selectedElement.xOffsets[index],
          y: clientY - selectedElement.yOffsets[index],
        }));
        const elementsCopy = [...elements];
        elementsCopy[selectedElement.id] = {
          ...elementsCopy[selectedElement.id],
          points: newPoints,
        };
        setElements(elementsCopy, true);
      } else {
        const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement;
        const width = x2 - x1;
        const height = y2 - y1;
        const newX1 = clientX - offsetX;
        const newY1 = clientY - offsetY;
        const options = type === "text" ? { text: selectedElement.text } : {};
        updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, options);
      }
    } else if (action === "resizing") {
      const { id, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates);
      updateElement(id, x1, y1, x2, y2, type);
    }

    sendData();
  };

  const handleMouseUp = event => {
    const { clientX, clientY } = event;
    if (selectedElement) {
      if (
        selectedElement.type === "text" &&
        clientX - selectedElement.offsetX === selectedElement.x1 &&
        clientY - selectedElement.offsetY === selectedElement.y1
      ) {
        setAction("writing");
        return;
      }

      const index = selectedElement.id;
      const { id, type } = elements[index];
      if ((action === "drawing" || action === "resizing") && adjustmentRequired(type)) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
        updateElement(id, x1, y1, x2, y2, type);
      }
    }

    if (action === "writing") return;

    setAction("none");
    setSelectedElement(null);
    sendData();
  };

  const handleBlur = event => {
    const { id, x1, y1, type } = selectedElement;
    setAction("none");
    setSelectedElement(null);
    updateElement(id, x1, y1, null, null, type, { text: event.target.value });
  };

  return (
    <>
    <div style={{background: 'whitesmoke',overflowX: 'auto',overflowY: 'auto'}}>
    <nav className={`left_nav ${navActive ? 'active': ''}`}>
            <div className='buttons'>
                <button onClick={undo}><ImUndo/></button>
                <button onClick={redo}><ImRedo/></button>
               

                <button onClick={zoomInHandler}><AiOutlineZoomIn/></button>
                <button><AiOutlineZoomOut onClick={zoomOuthandler}/></button>
                <button><GrPowerReset onClick={() => setZoom(1)}/></button>
                {
                  !socketId &&
                  <CopyToClipboard text={`${window.location.href}/${myId}`}>
                    <button title='copy share link'><FiShare2/></button>
                  </CopyToClipboard>
                }
                {/* <button><FaUserFriends/></button> */}
            </div>
            {/* <div>
                <div className='color' style={{background: color}}></div>
                <div className='input'>
                    <span>#</span>
                    <input type='text' value={color} onChange={(e) => setColor(e.target.value)}/>
                </div>
            </div> */}
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
            //  checked={tool === "rectangle"}
             onClick={() => setTool("rectangle")}
            ><BsSquare/></button>
            {/* <button><BsTriangle/></button> */}
            <button
            
            id="circle"
            //  checked={tool === "rectangle"}
             onClick={() => setTool("circle")}
            ><BsCircle/></button>
            {/* <button><CgShapeRhombus/></button> */}
            <button
            id="selection"
           
            onClick={() => setTool("selection")}
            
            ><AiOutlineSelect/></button>
            <button
            id="line" onClick={() => setTool("line")} 
            ><HiOutlineMinus/></button>
            <button
            id="pencil"
            onClick={pencilHandler}
            ><BsPencil/>
            </button>
            {
              strokeActive &&
              <div className='stroke_box flex_d_col'>
                  <label >
                    Stroke Width
                  </label>
                  <input type='text' placeholder='stroke width' list='size' value={strokeSize} onChange={(e) => setStrokeSize(e.target.value)}/>
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
                <SketchPicker  color={color}  onChangeComplete={(color) => setColor(color.hex)} defaultValue='#452135'/>
              </div>
            }
            <input type='file' style={{display: 'none'}} id='chooseFile' onChange={onUpload}/>
            <button><label htmlFor='chooseFile' ><RiGalleryFill/></label></button>
        </nav>
        
     
      {action === "writing" ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: "fixed",
            top: selectedElement.y1 - 2,
            left: selectedElement.x1,
            font: "24px sans-serif",
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            resize: "auto",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent",
          }}
        />
      ) : null}
      
      <canvas
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={canvasRef}
        style={{background: `url(${bgImage ?? null}),white`}}
      >? null
        Canvas
      </canvas>
    </div>
    <SweetAlert
      info
      confirmBtnText="Ok"
      confirmBtnBsStyle="info"
      title={`${newUserName} is Connect`}
      show={confirm}
      onConfirm={() => setConfirm(false)}
  />
    </>
  );
};

export default Drawing;