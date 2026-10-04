{
	"patcher": {
		"fileversion": 1,
		"appversion": {
			"major": 9,
			"minor": 1,
			"revision": 0,
			"architecture": "x64",
			"modernui": 1
		},
		"classnamespace": "box",
		"rect": [
			80.0,
			80.0,
			940.0,
			820.0
		],
		"gridsize": [
			15.0,
			15.0
		],
		"boxes": [
			{
				"box": {
					"id": "obj-1",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						12.0,
						400.0,
						32.0
					],
					"text": "idoi.sensorkit",
					"fontsize": 22.0,
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-2",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						44.0,
						640.0,
						20.0
					],
					"text": "calibrate -> plot -> record -> play back. Option-click any object for its help."
				}
			},
			{
				"box": {
					"id": "obj-3",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						76.0,
						300.0,
						20.0
					],
					"text": "1. a sensor (here: fake data)",
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-4",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						96.0,
						260.0,
						20.0
					],
					"text": "demo data: 3 channels at 50 Hz"
				}
			},
			{
				"box": {
					"id": "obj-5",
					"maxclass": "toggle",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						20.0,
						120.0,
						20.0,
						20.0
					],
					"outlettype": [
						"int"
					],
					"parameter_enable": 0
				}
			},
			{
				"box": {
					"id": "obj-6",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						50.0,
						120.0,
						84.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "loadmess 1"
				}
			},
			{
				"box": {
					"id": "obj-7",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"patching_rect": [
						20.0,
						148.0,
						70.0,
						22.0
					],
					"outlettype": [
						"bang"
					],
					"text": "metro 20"
				}
			},
			{
				"box": {
					"id": "obj-8",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"patching_rect": [
						20.0,
						176.0,
						49.0,
						22.0
					],
					"outlettype": [
						"bang",
						"bang"
					],
					"text": "t b b"
				}
			},
			{
				"box": {
					"id": "obj-9",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 4,
					"patching_rect": [
						20.0,
						204.0,
						63.0,
						22.0
					],
					"outlettype": [
						"int",
						"",
						"",
						"int"
					],
					"text": "counter"
				}
			},
			{
				"box": {
					"id": "obj-10",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"patching_rect": [
						20.0,
						268.0,
						105.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "pack 0. 0. 0."
				}
			},
			{
				"box": {
					"id": "obj-11",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"patching_rect": [
						80.0,
						204.0,
						49.0,
						22.0
					],
					"outlettype": [
						"int",
						"int"
					],
					"text": "t i i"
				}
			},
			{
				"box": {
					"id": "obj-12",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						20.0,
						232.0,
						154.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "expr sin($i1 * 0.05)"
				}
			},
			{
				"box": {
					"id": "obj-13",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						170.0,
						204.0,
						154.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "expr cos($i1 * 0.08)"
				}
			},
			{
				"box": {
					"id": "obj-14",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"patching_rect": [
						170.0,
						232.0,
						91.0,
						22.0
					],
					"outlettype": [
						"int"
					],
					"text": "random 1000"
				}
			},
			{
				"box": {
					"id": "obj-15",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						170.0,
						260.0,
						182.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "expr $i1 * 0.0005 - 0.25"
				}
			},
			{
				"box": {
					"id": "obj-16",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						300.0,
						76.0,
						300.0,
						20.0
					],
					"text": "2. idoi.calibrate",
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-17",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"patching_rect": [
						300.0,
						100.0,
						220.0,
						22.0
					],
					"outlettype": [
						"",
						""
					],
					"text": "v8 idoi.calibrate.js @smooth 0.5"
				}
			},
			{
				"box": {
					"id": "obj-18",
					"maxclass": "toggle",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						300.0,
						130.0,
						20.0,
						20.0
					],
					"outlettype": [
						"int"
					],
					"parameter_enable": 0
				}
			},
			{
				"box": {
					"id": "obj-19",
					"maxclass": "message",
					"numinlets": 2,
					"numoutlets": 1,
					"patching_rect": [
						328.0,
						130.0,
						70.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "learn $1"
				}
			},
			{
				"box": {
					"id": "obj-20",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						400.0,
						131.0,
						260.0,
						20.0
					],
					"text": "learn for a few seconds, then off"
				}
			},
			{
				"box": {
					"id": "obj-21",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						300.0,
						300.0,
						20.0
					],
					"text": "3. idoi.plotter",
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-22",
					"maxclass": "v8ui",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						20.0,
						324.0,
						440.0,
						180.0
					],
					"outlettype": [
						""
					],
					"filename": "idoi.plotter.js",
					"parameter_enable": 0,
					"border": 0
				}
			},
			{
				"box": {
					"id": "obj-23",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						480.0,
						300.0,
						300.0,
						20.0
					],
					"text": "4. idoi.datarecorder",
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-24",
					"maxclass": "v8ui",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						480.0,
						324.0,
						400.0,
						56.0
					],
					"outlettype": [
						""
					],
					"filename": "idoi.datarecorder.js",
					"parameter_enable": 0,
					"border": 0,
					"embedstate": [
						[
							"folder",
							"~/Documents"
						]
					]
				}
			},
			{
				"box": {
					"id": "obj-25",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 2,
					"patching_rect": [
						480.0,
						390.0,
						80.0,
						22.0
					],
					"outlettype": [
						"",
						""
					],
					"text": "route done"
				}
			},
			{
				"box": {
					"id": "obj-26",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						480.0,
						420.0,
						90.0,
						22.0
					],
					"outlettype": [
						""
					],
					"text": "prepend read"
				}
			},
			{
				"box": {
					"id": "obj-27",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						580.0,
						421.0,
						320.0,
						20.0
					],
					"text": "a finished take (done <path>) is loaded into the player"
				}
			},
			{
				"box": {
					"id": "obj-28",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						530.0,
						400.0,
						20.0
					],
					"text": "5. idoi.dataplayer -> idoi.plotter in xy mode",
					"fontface": 1
				}
			},
			{
				"box": {
					"id": "obj-29",
					"maxclass": "v8ui",
					"numinlets": 1,
					"numoutlets": 3,
					"patching_rect": [
						20.0,
						554.0,
						440.0,
						48.0
					],
					"outlettype": [
						"",
						"",
						""
					],
					"filename": "idoi.dataplayer.js",
					"parameter_enable": 0,
					"border": 0,
					"embedstate": [
						[
							"file",
							"idoi.sensorkit.demo.csv"
						],
						[
							"loop",
							1
						]
					]
				}
			},
			{
				"box": {
					"id": "obj-30",
					"maxclass": "v8ui",
					"numinlets": 1,
					"numoutlets": 1,
					"patching_rect": [
						480.0,
						470.0,
						400.0,
						300.0
					],
					"outlettype": [
						""
					],
					"filename": "idoi.plotter.js",
					"parameter_enable": 0,
					"border": 0,
					"embedstate": [
						[
							"mode",
							"xy"
						],
						[
							"samples",
							200
						],
						[
							"names",
							"ax",
							"ay"
						]
					]
				}
			},
			{
				"box": {
					"id": "obj-31",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						20.0,
						610.0,
						400.0,
						40.0
					],
					"text": "play the demo recording, or record a take above;\nchannels (0,1) are drawn as x/y"
				}
			}
		],
		"lines": [
			{
				"patchline": {
					"source": [
						"obj-6",
						0
					],
					"destination": [
						"obj-5",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-5",
						0
					],
					"destination": [
						"obj-7",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-7",
						0
					],
					"destination": [
						"obj-8",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-8",
						0
					],
					"destination": [
						"obj-9",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-9",
						0
					],
					"destination": [
						"obj-11",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-11",
						1
					],
					"destination": [
						"obj-13",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-11",
						0
					],
					"destination": [
						"obj-12",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-12",
						0
					],
					"destination": [
						"obj-10",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-13",
						0
					],
					"destination": [
						"obj-10",
						1
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-8",
						1
					],
					"destination": [
						"obj-14",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-14",
						0
					],
					"destination": [
						"obj-15",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-15",
						0
					],
					"destination": [
						"obj-10",
						2
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-18",
						0
					],
					"destination": [
						"obj-19",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-19",
						0
					],
					"destination": [
						"obj-17",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-10",
						0
					],
					"destination": [
						"obj-17",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-17",
						0
					],
					"destination": [
						"obj-22",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-17",
						0
					],
					"destination": [
						"obj-24",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-24",
						0
					],
					"destination": [
						"obj-25",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-25",
						0
					],
					"destination": [
						"obj-26",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-26",
						0
					],
					"destination": [
						"obj-29",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"obj-29",
						0
					],
					"destination": [
						"obj-30",
						0
					]
				}
			}
		],
		"dependency_cache": [],
		"autosave": 0
	}
}
