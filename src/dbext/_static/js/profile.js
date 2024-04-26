var profile =
{
    tableGroups:null, tableProfile:null, tableGId:'_', tablePId:'_', url:'',
    groupSelected:null, profileDataBackup:null,

    // =============== INIT

    init()
    {
        this.tableGroups = document.querySelector('#'+this.tableGId);
        this.tableProfile = document.querySelector('#'+this.tablePId);
        this.setConfigTables();
        this.setTableEvents();
        this.saveProfileBackup(this.tableProfile.DataArray);
        this.setAjustPanelOneEvent();
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
            if ((this.tableGroups?.DataArray??[]).length > 0) {
                this.tableGroups.NavTo(0,0);
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
    setAjustPanelOneEvent()
    {
        const line = document.querySelector('#ajust_panel_one');
        if (line)
        {
            let pageX, panel, panelWidth;
            
            line.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
            }
            line.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                panel = e.target.parentElement;
                panel.style.transition = 'none';
                pageX = e.pageX;
                panelWidth = panel.offsetWidth;
            }
            document.onmousemove = (e) => {
                e.stopPropagation();
                if (panel) {
                    let diffX = (e.pageX - pageX);
                    panel.style.width = (panelWidth + diffX)+'px';
                }
            }
            document.onmouseup = (e) => {
                e.stopPropagation();
                if (panel) panel.style.transition = '.5s';
                panel = undefined;
                pageX = undefined;
                panelWidth = undefined;
            }
        }
    },

    // =============== GROUP

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
            this.setProfileData((data.sitem_profile??[]));
        }
        else
        {
            sETable.classList.add('d-none');
            sEEmpty.classList.remove('d-none');

            groupInfo.innerHTML = '<small class="text-secondary">No hay información del grupo especificado.</small>';
            this.setProfileData([]);
        }        
    },

    // =============== PROFILE
    
    setProfileData(data)
    {
        this.tableProfile.DataArray = data;
        this.tableProfile._printRows();
    },
    getGroupProfileInfo(group)
    {
        let endpoint = this.url.replace('@id',group.sys_pk);

        InduxsoftCrudlModel.InvokeService(endpoint, null,
            success => { 
                this.printGroupSecuritySchema(success);
                this.saveProfileBackup((success?.sitem_profile??[]));
            },
            failure => { 
                this.printGroupSecuritySchema(null);
                alert('No se pudo obtener información del grupo indicado\n'+JSON.stringify(failure));
            },
            "GET", false
        );
    },
    saveProfileBackup(profileData)
    {
        this.profileDataBackup = JSON.parse(JSON.stringify(profileData));
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
        let data = {
            profile: (this.tableProfile?.DataArray?.filter(d => d.active==='Sí')?.map(d => ({item:d.sys_pk, guid:d.sys_guid}))??[])
        }

        let endpoint = this.url.replace('@id',this.groupSelected.sys_pk);

        InduxsoftCrudlModel.InvokeService(endpoint, data,
            success => { 
                console.log(success);
                this.saveProfileBackup(this.tableProfile.DataArray);
                this.showDirtyControls();
            },
            failure => { 
                alert('No fue posible guardar el esquema de seguridad del grupo.\n'+JSON.stringify(failure));
            },
            "POST", false
        );
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