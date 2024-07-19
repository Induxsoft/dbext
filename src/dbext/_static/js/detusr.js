const detusr =
{
    GET:{}, detfinder:null,

    new: {
        formId:"", form:null, elems:[],

        init()
        {
            this.form = document.getElementById(this.formId);
            this.elems = this.form.elements;

            const ik_usr = document.getElementById("ik_usr");
            const ik_det = document.getElementById("ik_det");
            const ik_itm = document.getElementById("ik_itm");

            ik_itm.onBeforeSearch = (url) => { return url.replace("@det",this.elems["ref_det"].value) };
            
            ik_det.change_event = (data) => this.changeDET(data);
            ik_itm.change_event = (data) => this.changeItm(data);
        },

        changeDET(data)
        {
            const toggleItmFields = function (hasfinder, finder=null) {
                const div_itm = document.getElementById("div_itm");
                const div_itm_fields = document.getElementById("div_itm_fields");
                const ik_itm = document.getElementById("ik_itm");
                const txt_detid = document.getElementById("txt_detid");
                const txt_detinfo = document.getElementById("txt_detinfo");

                let kf = (finder?.primarykey??"");
                let cf = (finder?.keyfield??"");
                let df = (finder?.textfield??"");
                let columns = cf+","+df;
                let colcaptions = cf.toUpperCase() +","+ df.toUpperCase();

                ik_itm.setAttribute("data-key",kf);
                ik_itm.setAttribute("data-search",cf);
                ik_itm.setAttribute("data-text",df);
                ik_itm.columns = columns;
                ik_itm.colcaptions = colcaptions;

                ik_itm.clear();
                txt_detid.value = 0;
                txt_detinfo.value = "";

                div_itm.hidden = !hasfinder;
                div_itm_fields.hidden = hasfinder;
            }

            let det = (data?.id??"");
            let url = "/!/dbext/detusr/?_view=det-has-finder&det="+det;

            if (det === "") {
                toggleItmFields(false);
                this.elems["div_itm_fields"].disabled = true;
                return
            }
            this.elems["div_itm_fields"].disabled = false;

            fetch(url).then(response => response.json())
            .then(data => {
                toggleItmFields(data.hasfinder,data?.finder);
                detusr.detfinder = data?.finder;
            })
            .catch(error => {
                console.error(error.message ?? error);
                toggleItmFields(false);
            })
        },

        changeItm(data)
        {
            let item = (data) ? data : {};
            this.elems["detid"].value = item[detusr.detfinder?.primarykey??""] ?? 0;
            this.elems["detinfo"].value = item[detusr.detfinder?.textfield??""] ?? "";
        },
    },
    
    edt: {
        formId:"", form:null, elems:[],
        tableId:"", table:null, array:[],
        url_exit:"/!/dbext/detusr/",
        error_timeout:7,

        init()
        {
            this.form = document.getElementById(this.formId);
            this.elems = this.form.elements;
            this.table = document.getElementById(this.tableId);
            this.array = this.table?.DataArray??[];

            this.table.AutoAddRow = false;
            this.table.AutoDelRow = false;

            const ik_sitems = document.getElementById("ik_sitems");
            const btn_submit = document.getElementById("btn_submit");
            const btn_add_row = document.getElementById("btn_add_row");
            const btn_del_row = document.getElementById("btn_del_row");

            btn_submit.addEventListener("click", (e) => this.submit(e.target));
            btn_add_row.addEventListener("click", () => ik_sitems.searchText("",false));
            btn_del_row.addEventListener("click", () => this.table.DeleteCurrentRow());
            ik_sitems.change_event = (data) => this.agregarSitem(data);
        },

        filterDataArray(){ return (this.table?.DataArray??[]).filter(row => { return Object.keys(row??{}).length >= (this.table?.Columns??[]).length }) },

        agregarSitem(data)
        {
            if (!data) return;
            
            let sitem =
            {
                sys_pk: (data?.sys_pk??0),
                sys_recver: (data?.sys_recver??0),
                ref_det_usr: Number(this.elems["sys_pk"].value),
                itemid: data.itemid,
                description: data.description
            }

            let index = this.table.CurrentRowIndex();
            let sitems = this.filterDataArray();
            let available_row = (sitems.length > 0) ? sitems.length : 0;

            if (this.array.length === sitems.length) this.table.AddRow();
            
            this.array[available_row] = sitem;
            this.table.UpdateRow(available_row);
        },

        submit(button)
        {
            let permisos = this.filterDataArray();
            if (permisos.length < 1) {
                alert("Es necesario agregar al menos un elemento a lista para continuar.");
                return
            }

            button.disabled = true;

            let fd = new FormData(this.form);
            fd.append("_sitems",JSON.stringify(permisos));

            const onSuccess = (data) => {
                if (!(data?.success??true) || (data?.message??"")!=="") {
                    this.show_alert("#form_alerts",(data?.message ?? JSON.stringify(data)),this.error_timeout);
                    button.disabled = false;
                    return
                }
                
                button.disabled = false;
                window.location.href = this.url_exit;
            }
    
            const onFailure = (error) => {
                this.show_alert("#form_alerts",(error.message ?? JSON.stringify(error)),this.error_timeout);
                button.disabled = false;
            }

            InduxsoftCrudlModel.InvokeService("./",fd,onSuccess,onFailure,"PUT",false,true,"",true);
        },

        show_alert(selector,content,timeout)
        {
            const alert = document.querySelector(selector);
            if (!alert) return;
            if (!content) return;
            
            alert.classList.remove("d-none");
            alert.innerHTML = content;

            setTimeout(function() {
                alert.classList.add("d-none");
                alert.innerHTML = "";
            }, (timeout * 1000));
        },
    },
}