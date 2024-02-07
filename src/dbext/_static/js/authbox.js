
document.addEventListener("DOMContentLoaded",()=>
{
    auth.init();
});
var auth=
{
    init()
    {
        auth.form_search=document.getElementById("form_search");
        auth.select_filter=document.getElementById("select_filter");

        if(auth.select_filter)auth.select_filter.addEventListener("change",()=>
        {
            if(auth.form_search)auth.form_search.submit();
        })
    },
    action(act=1,sys_guid)
    {
        var data=
        {
            uuid:sys_guid,
            act:act
        }
        var text_notas=document.getElementById("text_notas");

        if(!text_notas)
        {
            var r=prompt("Nota:");
            if(r==null)return;
        }
        else
        {
            var r=text_notas.value??"";
        }
        if(r.trim()=="")
        {
            if(text_notas)text_notas.focus();
            alert("Debe colocar una nota");
            return;
        }

        data["notas"]=r;
        
        InduxsoftCrudlModel.InvokeService(".", data,
            success => 
            { 
                window.location.reload();
            },
            failure => 
            { 
                alert(failure.message??failure);
            },
            "POST", false
        );
    }
}