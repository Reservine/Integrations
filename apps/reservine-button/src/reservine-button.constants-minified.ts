export const reservineButtonStyles = `
.r-drawer-content{position:fixed;bottom:0;left:0;right:0;display:flex;z-index:50;height:auto;flex-direction:column;border-radius:10px 10px 0 0;border:1px solid #1e293b;background-color:#0e172a;max-width:1200px;width:100vw;height:calc(100svh - 52px);margin:0 auto;overscroll-behavior:contain;outline:none!important}
@media(max-width:1200px){.r-drawer-content{border-left:none;border-right:none}}
.r-drawer-header{height:42px;display:flex;align-items:center;justify-content:center;background:rgb(2,6,23);border-radius:10px 10px 0 0}
.r-drawer-handle{border-radius:10px;background-color:#344255;height:8px;width:5rem}
.r-drawer-close{position:absolute;top:-48px;left:4px;cursor:pointer;width:42px;height:42px;background-color:rgba(15,23,42,0.5);backdrop-filter:blur(3px);border-radius:50%;border:1px solid rgb(30,41,59);padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;outline:none!important}
.r-drawer-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:50;background-color:rgba(0,0,0,0.5)}
[data-vaul-drawer]{touch-action:none;transition:transform 0.5s cubic-bezier(0.32,0.72,0,1)}
[data-vaul-drawer][data-vaul-drawer-direction="bottom"]{transform:translate3d(0,100%,0)}
[data-vaul-drawer][data-vaul-drawer-direction="top"]{transform:translate3d(0,-100%,0)}
[data-vaul-drawer][data-vaul-drawer-direction="left"]{transform:translate3d(-100%,0,0)}
[data-vaul-drawer][data-vaul-drawer-direction="right"]{transform:translate3d(100%,0,0)}
.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="top"]{overflow-y:hidden!important}
.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="bottom"]{overflow-y:hidden!important}
.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="left"]{overflow-x:hidden!important}
.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="right"]{overflow-x:hidden!important}
[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="top"]{transform:translate3d(0,var(--snap-point-height,0),0)}
[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="bottom"]{transform:translate3d(0,var(--snap-point-height,0),0)}
[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="left"]{transform:translate3d(var(--snap-point-height,0),0,0)}
[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="right"]{transform:translate3d(var(--snap-point-height,0),0,0)}
[data-vaul-overlay]{opacity:0;transition:opacity 0.5s cubic-bezier(0.32,0.72,0,1)}
[data-vaul-overlay][data-vaul-drawer-visible="true"]{opacity:1}
[data-vaul-drawer]::after{content:"";position:absolute;background:inherit;background-color:inherit}
[data-vaul-drawer][data-vaul-drawer-direction="top"]::after{top:initial;bottom:100%;left:0;right:0;height:200%}
[data-vaul-drawer][data-vaul-drawer-direction="bottom"]::after{top:100%;bottom:initial;left:0;right:0;height:200%}
[data-vaul-drawer][data-vaul-drawer-direction="left"]::after{left:initial;right:100%;top:0;bottom:0;width:200%}
[data-vaul-drawer][data-vaul-drawer-direction="right"]::after{left:100%;right:initial;top:0;bottom:0;width:200%}
[data-vaul-overlay][data-vaul-snap-points="true"]:not([data-vaul-snap-points-overlay="true"]):not([data-state="closed"]){opacity:0}
[data-vaul-overlay][data-vaul-snap-points-overlay="true"]:not([data-vaul-drawer-visible="false"]){opacity:1}
@keyframes -global-fake-animation{from{}to{}}
@media(hover:hover)and(pointer:fine){[data-vaul-drawer]{user-select:none}}`;
