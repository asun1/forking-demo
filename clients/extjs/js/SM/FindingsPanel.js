Ext.ns('SM')

SM.AggregatorCombo = Ext.extend(Ext.form.ComboBox, {
    initComponent: function () {
        let me = this
        let config = {
            width: 150,
            forceSelection: true,
            editable: false,
            mode: 'local',
            triggerAction: 'all',
            displayField:'display',
            valueField: 'aggregator',
            store: new Ext.data.SimpleStore({
                fields: ['display', 'aggregator'],
                data : [['GroupID', 'groupId'],['RuleID', 'ruleId'],['CCI', 'cci']]
            })
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.AggregatorCombo.superclass.initComponent.call(this)
    }
})
Ext.reg('sm-aggregator-combo', SM.AggregatorCombo)

SM.FindingsParentGrid = Ext.extend(Ext.grid.GridPanel, {
    initComponent: function() {
        let me = this
        this.aggValue = this.aggValue || 'groupId'
        this.stigAllValue = '--- All Collection STIGs ---'
        this.stigValue = this.stigValue || this.stigAllValue
        const totalTextCmp = new Ext.Toolbar.TextItem ({
            text: '0 records',
            width: 80
        })
        const store = new Ext.data.JsonStore({
			proxy: new Ext.data.HttpProxy({
				url: `${STIGMAN.Env.apiBase}/collections/${this.panel.collectionId}/findings`,
				method: 'GET'
			}),
			baseParams: {
				projection: 'stigs'
			},
			sortInfo: {
				field: 'assetCount',
				direction: 'DESC'
			},
			root: '',
			fields: [
				{ name: 'severity', type: 'string' },
				{ name: 'assetCount', type: 'int' },
				{ name: 'stigs' },
				{ name: 'groupId', type: 'string', sortType: sortGroupId },
				{ name: 'ruleId', type: 'string' },
				{ name: 'title', type: 'string' },
				{ name: 'cci', type: 'string' },
				{ name: 'definition', type: 'string' },
				{ name: 'apAcronym', type: 'string' },
			],
			listeners: {
				load: function (store, records) {
					totalTextCmp.setText(records.length + ' records');
				}
			}
        })
        const renderSeverity = val => {
            switch (val) {
                case 'high':
                    return '1';
                case 'medium':
                    return '2';
                case 'low':
                    return '3';
                case 'mixed':
                    return 'M';
                default:
                    return 'U';
            }
        }
        const columns = [
			{ 
				header: "CAT", 
				hidden: false,
				align: 'center', 
				width: 60, 
				dataIndex: 'severity', 
				sortable: true, 
				renderer: renderSeverity
			 },
			 { 
				header: "Group", 
				hidden: false,
				width: 80, 
				dataIndex: 'groupId', 
				sortable: true, 
			},
			{ 
				header: "Rule", 
				hidden: true,
				width: 80, 
				dataIndex: 'ruleId', 
				sortable: true, 
			},
			{ 
				header: "CCI", 
				hidden: true,
				width: 80, 
				dataIndex: 'cci', 
				sortable: true, 
			},
			{ 
				header: "AP Acronym", 
				hidden: true,
				width: 80, 
				dataIndex: 'apAcronym', 
				sortable: true, 
			},
			{ 
				header: "Title", 
				hidden: false,
				width: 270, 
				dataIndex: 'title', 
				renderer: columnWrap, 
				sortable: true, 
			},
			{ 
				header: "Definition", 
				hidden: true,
				width: 135, 
				dataIndex: 'definition', 
				renderer: columnWrap, 
				sortable: true, 
			},
			{ 
				header: "Assets", 
				hidden: false,
				width: 75, 
				align: 'center', 
				dataIndex: 'assetCount', 
				sortable: true 
			},
			{ 
				header: "STIGs",
				hidden: false,
				width: 120, 
				dataIndex: 'stigs', 
				renderer: v => {
					return columnWrap(v.join('\n'))
				}, 
				sortable: true, 
			}
        ]
        const view = new Ext.grid.GridView({
			forceFit: true,
			emptyText: 'No records found.',
			getRowClass: function (record, rowIndex, rp, ds) { // rp = rowParams
				if (record.data.severity == 'high') {
					return 'sm-grid3-row-red';
				} else if (record.data.severity == 'medium') {
					return 'sm-grid3-row-orange';
				} else {
					return 'sm-grid3-row-green';
				}
			}
        })
        const sm = new Ext.grid.RowSelectionModel({
			singleSelect: true,
			listeners: {
				rowselect: (sm, index, record) => {
                    me.panel.fireEvent('parentrowselect', sm, index, record)
                }
			}
        })
        const tbar = new Ext.Toolbar({
			// hidden: (curUser.accessLevel !== 3),
			items: [
				{
					xtype: 'tbtext',
					text: 'Aggregate by'
				},
				{
                    xtype: 'sm-aggregator-combo',
                    value: this.aggValue,
                    listeners: {
                        select: function (f, r, i) {
                            me.aggValue = f.getValue()
                            me.fireEvent('aggregatorchanged', me.aggValue)
                        }
                    }
				},
				{
					xtype: 'tbtext',
					text: 'STIG:  '
				},
				{
					xtype: 'sm-stig-selection-field',
					url: `${STIGMAN.Env.apiBase}/collections/${this.panel.collectionId}?projection=stigs`,
					autoLoad: true,
					includeAllItem: this.stigAllValue,
					root: 'stigs',
					width: 300,
					triggerAction: 'all',
					allowBlank: true,
					editable: false,
					forceSelection: true,
					value: this.stigValue,
					listeners: {
						select: function (f, r, i) {
                            me.stigValue = f.getValue()
							me.fireEvent('stigchanged')
						}
					}
				}
			]
		})
        const bbar = new Ext.Toolbar({
			items: [
				{
					xtype: 'tbbutton',
					iconCls: 'icon-refresh',
					tooltip: 'Reload this grid',
					width: 20,
					handler: function (btn) {
						store.reload();
					}
				},
				{
					xtype: 'tbseparator'
				},
				{
					xtype: 'exportbutton',
					hasMenu: false,
					gridBasename: 'Findings',
					storeBasename: 'Findings (store)',
					iconCls: 'sm-export-icon',
					text: 'Export'
				},
				{
					xtype: 'tbfill'
				},
				{
					xtype: 'tbseparator'
				},
				totalTextCmp
			]
        })
        const onAggregatorChanged = (aggregator) => {
            store.load({
                params: {
                    aggregator: aggregator
                }
            })
        }
        const config = {
            loadMask: true,
            store: store,
            columns: columns,
            view: view,
            sm: sm,
            tbar: tbar,
            bbar: bbar,
            listeners: {
                aggregatorchanged: onAggregatorChanged,
                // stigchanged: me.onStigChanged
            },

        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.FindingsParentGrid.superclass.initComponent.call(this)
    }
})

SM.FindingsChildGrid = Ext.extend(Ext.grid.GridPanel, {
    initComponent: function() {
        const me = this
        const totalTextCmp = new Ext.Toolbar.TextItem ({
            text: '0 records',
            width: 80
        })
        const store = new Ext.data.JsonStore({
			proxy: new Ext.data.HttpProxy({
				url: `${STIGMAN.Env.apiBase}/collections/${this.panel.collectionId}/reviews`,
				method: 'GET'
			}),
			baseParams: {
				result: 'fail',
				projection: 'stigs'
			},
			sortInfo: {
				field: 'assetName',
				direction: 'DESC'
			},
			root: '',
			fields: [
				{ name: 'assetId', type: 'string' },
				{ name: 'assetName', type: 'string' },
				{ name: 'stigs' },
				{ name: 'ruleId', type: 'string' },
				{ name: 'result', type: 'string' },
				{ name: 'resultComment', type: 'string' },
				{ name: 'action', type: 'string' },
				{ name: 'actionComment', type: 'string' },
				{ name: 'autoResult', type: 'boolean' },
				{ name: 'status', type: 'string' },
				{ name: 'userId', type: 'string' },
				{ name: 'username', type: 'string' },
				{ name: 'ts', type: 'string' },
				{ name: 'reviewComplete', type: 'boolean' }
			],
			listeners: {
				load: function (store, records) {
					totalTextCmp.setText(records.length + ' records');
				}
			}
        })
        const columns = [
			{ 
				header: "Asset", 
				align: 'center', 
				width: 60, 
				dataIndex: 'assetName', 
				sortable: true
			 },
			 { 
				header: "Rule", 
				width: 80, 
				dataIndex: 'ruleId', 
				sortable: true, 
			},
			{ 
				header: "Result Comment", 
				width: 80, 
				dataIndex: 'resultComment', 
				sortable: true, 
			},
            { 
				header: "Action", 
				width: 80, 
				dataIndex: 'action', 
				sortable: true, 
			},
			{ 
				header: "Action Comment", 
				width: 80, 
				dataIndex: 'actionComment', 
				sortable: true, 
			},
			{ 
				header: "Status", 
				width: 80, 
				dataIndex: 'status', 
				sortable: true, 
			},
			{ 
				header: "Last changed", 
				width: 80, 
				dataIndex: 'ts', 
				sortable: true, 
			},
			{ 
				header: "STIGs", 
				width: 270, 
				dataIndex: 'stigs', 
				renderer: v => {
					return columnWrap(v.join('\n'))
				}, 
				sortable: true, 
			}
        ]
        const view = new Ext.grid.GridView({
			forceFit: true,
			emptyText: 'No records found.'

        })
        const sm = new Ext.grid.RowSelectionModel({
			singleSelect: true
        })
        const bbar = new Ext.Toolbar({
			items: [
				{
					xtype: 'tbbutton',
					iconCls: 'icon-refresh',
					tooltip: 'Reload this grid',
					width: 20,
					handler: function (btn) {
						store.reload();
					}
				},
				{
					xtype: 'tbseparator'
				},
				{
					xtype: 'exportbutton',
					hasMenu: false,
					gridBasename: 'Finding Details',
					storeBasename: 'Finding Details (store)',
					iconCls: 'sm-export-icon',
					text: 'Export'
				},
				{
					xtype: 'tbfill'
				},
				{
					xtype: 'tbseparator'
				},
				totalTextCmp
			]
		})
        const config = {
            loadMask: true,
            store: store,
            columns: columns,
            view: view,
            sm: sm,
            bbar: bbar
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.FindingsChildGrid.superclass.initComponent.call(this)
    }
})

// config: {collectionId}
SM.FindingsPanel = Ext.extend(Ext.Panel, {
    initComponent: function () {
        const parent = new SM.FindingsParentGrid({
            cls: 'sm-round-panel',
            margins: { top: SM.Margin.top, right: SM.Margin.edge, bottom: SM.Margin.adjacent, left: SM.Margin.edge },
            border: false,                 
            region: 'center',
            panel: this,
            title: 'Aggregated Findings'
        })
        const child = new SM.FindingsChildGrid({
            cls: 'sm-round-panel',
            margins: { top: SM.Margin.adjacent, right: SM.Margin.edge, bottom: SM.Margin.bottom, left: SM.Margin.edge },
            border: false,                 
            region: 'south',
            height: 400,
            split: true,
            panel: this,
            title: 'Individual Findings'
        })
        parent.child = child
        child.parent = parent
        this.parent = parent
        this.child = child

        onParentRowSelect = (sm, index, record) => {
            const params = {}
            params[parent.aggValue] = record.data[parent.aggValue]
            if (parent.stigValue !== parent.stigAllValue) {
                params.benchmarkId = parent.stigValue
            }
            child.store.load({
                params: params
            })
        }
        const config = {
            layout: 'border',
            border: false,
            items: [
                parent,
                child
            ],
            listeners: {
                parentrowselect: onParentRowSelect
            }
        }

        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.FindingsPanel.superclass.initComponent.call(this)

        // parent.store.load({
        //     params: {
        //         aggregator: parent.aggValue
        //     }
        // })

    }
})

