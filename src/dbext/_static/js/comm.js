var comm =
{
    init()
    {
    },
    add_channel()
    {
        let data = main.getValues('modal_add_channel',false,true);
        if (!data) return;

        main.closeModal('modal_add_channel');
        InduxsoftCrudlModel.InvokeService('./_new/', data, 
            success => { 
                window.location.reload(); 
            },
            failure => { 
                alert('No se pudo guardar el canal\n\n'+(failure.message??JSON.stringify(failure))); 
                main.clearValues('modal_add_channel'); 
            },
            'POST', false
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    comm.init();
});