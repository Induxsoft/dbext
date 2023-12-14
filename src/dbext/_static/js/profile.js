var profile =
{
    tableGroups:null, tableProfile:null, tableGId:'_', tablePId:'_',
    groupSelected:null, profileDataBackup:null,

    init()
    {
        this.tableGroups = document.querySelector('#'+this.tableGId);
        this.tableProfile = document.querySelector('#'+this.tablePId);
        this.setTableEvents();
    },
    setConfigTables()
    {
        if (this.tableGroups)
        {
            this.tableGroups.AutoAddRow = false;
            this.tableGroups.AutoDelRow = false;
            this.tableGroups.EverMove = false;
        }
        if (this.tableProfile)
        {
            this.tableProfile.AutoAddRow = false;
            this.tableProfile.AutoDelRow = false;
            this.tableProfile.EverMove = false;
        }
    },
    setTableEvents()
    {
        if (this.tableGroups)
        {
            this.tableGroups.Events[this.tableGroups.EdiTable.Const.Events.BeforeCellFocus] = (e) =>
            {
                if (this.isDirtyProfile()) {
                    if (!confirm('Se han realizado modificaciones en el esquema de seguridad del grupo actual. ¿Desea descartar los cambios?'))
                        e.cancel = true;
                }
            }
            this.tableGroups.Events[this.tableGroups.EdiTable.Const.Events.EnterCell] = (e) =>
            {
                this.groupSelected = this.tableGroups.DataArray[e.sender.CurrentRowIndex()];
                if (this.groupSelected) this.getGroupProfileInfo(this.groupSelected);
            }
        }
        if (this.tableProfile)
        {
            this.tableProfile.Events[this.tableProfile.EdiTable.Const.Events.FieldUpdated] = (e) =>
            {
                this.showDirtyControls();
            }
        }
    },

    getGroupProfileInfo(group)
    {
        let endpoint = profile.url.replace('@id',group.sys_pk);

        InduxsoftCrudlModel.InvokeService(endpoint, null,
            success => { 
                this.printGroupSecuritySchema(success);
                this.saveProfileBackup(success);
            },
            failure => { 
                this.printGroupSecuritySchema(null);
                alert('No se pudo obtener información del grupo indicado\n'+JSON.stringify(failure));
            },
            "GET", false
        )
    },

    printGroupSecuritySchema(data)
    {
        const groupInfo = document.querySelector('#groupInfo');
        const sETable = document.querySelector('#securityEschemaTable');
        const sEEmpty = document.querySelector('#securityEschemaEmpty');

        if (data)
        {
            sETable.classList.remove('d-none');
            sEEmpty.classList.add('d-none');

            groupInfo.innerHTML = `
                <div class="group-box-info"><small class="fw-5">ID</small><p class="m-0">${data.groupid??''}</p></div>
                <div class="group-box-info"><small class="fw-5">ID</small><p class="m-0">${data.description??''}</p></div>
                <div class="group-box-info"><small class="fw-5">ID</small><p class="m-0">${data.notes??''}</p></div>
            `;

            this.tableProfile.DataArray = (data.sitem_profile??[]);
        }
        else
        {
            sETable.classList.add('d-none');
            sEEmpty.classList.remove('d-none');

            groupInfo.innerHTML = '<small class="text-secondary">No hay información del grupo especificado.</small>';
            this.tableProfile.DataArray = [];
        }

        this.tableProfile._printRows();
    },
    saveProfileBackup(groupData)
    {
        this.profileDataBackup = JSON.parse(JSON.stringify(groupData?.sitem_profile??[]));
    },
    isDirtyProfile()
    {
        let isDirty = false;
        if (!isDirty && this.tableProfile.DataArray && this.profileDataBackup)
            isDirty = (JSON.stringify(this.tableProfile.DataArray) !== JSON.stringify(this.profileDataBackup));
        return isDirty;
    },
    showDirtyControls()
    {
        const isDirty = this.isDirtyProfile();

        document.querySelectorAll('#perfil_control button').forEach(b => {
            b.classList.toggle('d-none', !isDirty);
        });
    },
    saveSecureSchema()
    {
        alert('Función no implementada');
    },
    discardSecureSchema()
    {
        this.tableProfile.DataArray = JSON.parse(JSON.stringify(this.profileDataBackup));
        this.tableProfile._printRows();
        this.showDirtyControls();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    profile.init();
});