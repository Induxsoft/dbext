var definitive=definitive || {};

// Antes usaba $.ajax de jQuery (cargado de code.jquery.com). Mismo comportamiento con fetch:
// - success(data) con respuesta 2xx y JSON válido (o success(null) si no hay contenido, 204);
// - error(xhr) con un objeto como el jqXHR (readyState, status, statusText, responseText, responseJSON)
//   cuando la respuesta no es 2xx, el JSON no se puede leer o falla la red.
definitive.rest=function(uri, method, data, success, fail, error,reload=false){
    var verbo=String(method || "GET").toUpperCase();
    var cuerpo=JSON.stringify(data);
    var url=uri;
    var opciones={
        "method":verbo,
        "headers":{
            "Content-Type":"application/json",
            "Accept":"application/json, text/javascript, */*; q=0.01",
            "X-Requested-With":"XMLHttpRequest"
        },
        "credentials":"same-origin"
    };
    if (verbo==="GET" || verbo==="HEAD")
    {
        if (cuerpo!==undefined) url+=(url.indexOf("?")>=0 ? "&" : "?")+cuerpo;
    }
    else if (cuerpo!==undefined)
        opciones.body=cuerpo;

    function falla(xhr) {
        if (error)
            error(xhr);
        if (reload){window.location.reload();}
    }

    fetch(url, opciones).then(function(r){
        return r.text().then(function(texto){
            var xhr={"readyState":4,"status":r.status,"statusText":r.statusText,"responseText":texto};
            var json, valido=false;
            if (texto!=="")
            {
                try { json=JSON.parse(texto); valido=true; } catch(e) { valido=false; }
            }
            if (valido) xhr.responseJSON=json;
            var ok=(r.status>=200 && r.status<300) || r.status===304;
            if (!ok) { falla(xhr); return; }
            if (r.status===204 || verbo==="HEAD") json=undefined;
            else if (!valido) { xhr.statusText="parsererror"; falla(xhr); return; }
            console.log(json);
            if (r.status>=200 && r.status<300)
            {
                if(json !=null || json!=undefined)
                {
                    success(json);
                }
                else if(success)
                {
                    success(null);
                }
            }
            else
                fail(json)
        });
    }, function(e){
        falla({"readyState":0,"status":0,"statusText":"error","responseText":""});
    });
};

(function(){
    function on_doc_ready() {
        if (definitive.onready)
            definitive.onready();
    }
    if (document.readyState==="loading")
        document.addEventListener("DOMContentLoaded", on_doc_ready);
    else
        setTimeout(on_doc_ready, 0);
})();
