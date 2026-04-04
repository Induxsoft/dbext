var snd_scheduled_notif = {

    table_id: "",

    init() {
        const form = document.getElementById("form-filter");
        const table = document.getElementById(this.table_id);
        const date_range = document.querySelector("date-range");

        document.getElementById('btn-cancel')
            ?.addEventListener('click', () => this._cancel());

        date_range.onChanging = (oldData,newData) => { date_range.setData(newData) };
        date_range.onChange = (data) => { form.submit() };

        // Habilita/deshabilita el botón Cancelar según el status de la fila seleccionada.
        table.Events['rowchanged'] = (e) => {
            const row = e.sender.DataArray[e.sender.CurrentRowIndex()];
            this._toggleCancelBtn(row?.status === 'pending');
        };
    },

    _getCurrentRow() {
        const table = document.getElementById(this.table_id);
        if (!table) return null;
        return table.DataArray[table.CurrentRowIndex()] ?? null;
    },

    _toggleCancelBtn(enabled) {
        const btn = document.getElementById('btn-cancel');
        if (!btn) return;
        btn.disabled = !enabled;
    },

    _cancel() {
        const row = this._getCurrentRow();

        if (!row) {
            alert('Seleccione una notificación de la lista.');
            return;
        }
        if (row.status !== 'pending') {
            alert('Solo se pueden cancelar notificaciones en estado Pendiente.');
            return;
        }

        const fecha = row.scheduled_for ?? '';
        if (!confirm(`¿Cancelar la notificación programada para "${row.recipient_name}" el ${fecha}?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        InduxsoftCrudlModel.InvokeService(
            './' + row.sys_pk + '/',
            {},
            ()      => { window.location.reload(); },
            (error) => { alert('Error al cancelar: ' + error.message); },
            'DELETE',
            false
        );
    }
};
