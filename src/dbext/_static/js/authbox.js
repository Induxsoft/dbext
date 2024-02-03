
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
        var r=prompt("nota:");
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