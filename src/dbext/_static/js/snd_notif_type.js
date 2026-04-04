var snd_notif_type = {

    form_id: "",
    urlexit: "..",

    init() {
        const form    = document.getElementById(this.form_id);
        const channel = document.getElementById('snd_channel');

        // Submit: combina el form principal con form-params y envía vía fetch.
        form.addEventListener('submit', e => {
            e.preventDefault();
            this._submit(e.target);
        });

        // Cambio de canal: recarga la página enviando los valores actuales como
        // query string para que el servidor renderice los controles del proveedor.
        channel.addEventListener('change', () => {
            const url = window.location.href.split('?')[0];
            const qry = new URLSearchParams(this.formObj(form)).toString();
            window.location.href = url + '?' + qry;
        });
    },

    formObj(formOrId) {
        const form = (typeof formOrId === 'string')
            ? document.getElementById(formOrId)
            : formOrId;
        return Object.fromEntries(new FormData(form).entries());
    },

    _submit(form) {
        const formParams = document.getElementById('form-params');
        if (formParams && !formParams.reportValidity()) return;

        let payload = this.formObj(form);
        const method = (Number(payload.sys_pk) > 0) ? 'PATCH' : 'POST';

        // Los valores de los controles dinámicos se envían serializados como JSON
        // en el campo `params`, que el model.dk guarda en snd_notif_type.params.
        payload.params = formParams ? this.formObj(formParams) : {};

        InduxsoftCrudlModel.InvokeService('.', payload,
            ()      => { window.location.href = this.urlexit; },
            (error) => { alert(error.message); },
            method, false
        );
    }
};
