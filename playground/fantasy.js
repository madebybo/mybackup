/* for fantasy football detection */

window.Fantasy = {
	QB: [{
		name: 'Drew Brees | ',
		cost: 9100
	}, {
		name: 'Tom Brady | ',
		cost: 8100
	}],

	RB: [{
		name: 'DeMarco Murray | ',
		cost: 8700
	}, {
		name: 'Knile Davis | ',
		cost: 7000
	}, {
		name: 'Rashad Jennings | ',
		cost: 6400
	}, {
		name: 'Ahmad Bradshaw | ',
		cost: 5200
	}],

	WR: [{
		name: 'Calvin Johnson | ',
		cost: 9000
	}, {
		name: 'Antonio Brown | ',
		cost: 8200
	}, {
		name: 'Mike Wallace | ',
		cost: 6500
	}, {
		name: 'Marques Colston | ',
		cost: 5600
	}, ],

	TE: [{
		name: 'Jimmy Graham | ',
		cost: 8400
	}, {
		name: 'Greg Olsen | ',
		cost: 6100
	}],

	crunch: function() {
		var QBindex, RB1index, RB2index, WR1index, WR2index, WR3index, TEindex;

		for (QBindex = 0; QBindex < this.QB.length; QBindex++) {
			for (RB1index = 0; RB1index < this.RB.length; RB1index++) {
				for (RB2index = (RB1index + 1); RB2index < this.RB.length; RB2index++) {
					for (WR1index = 0; WR1index < this.WR.length; WR1index++) {
						for (WR2index = WR1index + 1; WR2index < this.WR.length; WR2index++) {
							for (WR3index = WR2index + 1; WR3index < this.WR.length; WR3index++) {
								for (TEindex = 0; TEindex < this.TE.length; TEindex++) {
									if (
										((this.RB[RB1index].cost + this.RB[RB2index].cost) > 15700) ||
										((this.WR[WR1index].cost + this.WR[WR2index].cost + this.WR[WR3index].cost) > 22500) ||
										((
											this.QB[QBindex].cost +
											this.RB[RB1index].cost + this.RB[RB2index].cost +
											this.WR[WR1index].cost + this.WR[WR2index].cost + this.WR[WR3index].cost +
											this.TE[TEindex].cost
										) > 51000)
									) {
										continue;
									}

									console.log('lineup: ' + (
										this.QB[QBindex].name +
										this.RB[RB1index].name + this.RB[RB2index].name +
										this.WR[WR1index].name + this.WR[WR2index].name + this.WR[WR3index].name +
										this.TE[TEindex].name
									));

									console.log('total cost: ' + (
										this.QB[QBindex].cost +
										this.RB[RB1index].cost + this.RB[RB2index].cost +
										this.WR[WR1index].cost + this.WR[WR2index].cost + this.WR[WR3index].cost +
										this.TE[TEindex].cost
									));

									//console.log('count');

								}
							}
						}
					}
				}
			}
		}
	}
}

Fantasy.crunch();



ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCne1FuHqD0JoR03kRFtsN99h7r5glUx27utT7NawPa0uaeCgL/0Kr2KcLXtZzDNnRMdC1viXwEg8Dm5ZC3kAMuNe3rxHONX+azxZWFF4aAONb4ajvZQ2Kb5nuTUUS+lkhb/el9QWFIZ0bGiy/rPRWe3YW/wb997NlMv+OjSBexFBVMe+bBUbD70CkdVC8LFrI+wE964m02Ozi5kYdlKj97uSgOd+lEe1Nq+mWNt0uOly8W+6wjZM2OuzlISqAoKgMFA5j28y3p9HMhs6c7DjeKrT98k2N9ZI376/3163DNusoiT0XQx1ILGu/JWpk+wNhz8L94hQuvqGvAQka4SfEz KimY@apnok-sendurpandians-l.search.iac.corp
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDWUIBZyM1cStRVofGdPVZbTGcTT0HmfWSRlMNqJiX4ANoSVpChvG4co2VH9LHrNjh6WH5iA4wlYQg2OMnEh6b4Zqqeda5OwFoE4F2t5oB/HeBcg//wNuKJ36rwDiKE90y5PA+sua5Y7ENysge3sA6BiG79i3iRSgCrcNVXbvS7JUi116UlRwqcuxPSEMusIZNItxFC1remkKpVlYlFBvyfVxJxoD7c7CS2tDn3mFKlfvLsT0cz/HRcBw2dwmSiMrOY6PGxWD7iLuh759aIJ2NFcVnEz06zIgR61W7g3adSz50/FlvBbWzZSWvblHY9y0LWd3h6zhUtbfDmoexTzJ+7 bowang@Bo-Wangs-MacBook-Pro.local
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDWUIBZyM1cStRVofGdPVZbTGcTT0HmfWSRlMNqJiX4ANoSVpChvG4co2VH9LHrNjh6WH5iA4wlYQg2OMnEh6b4Zqqeda5OwFoE4F2t5oB/HeBcg//wNuKJ36rwDiKE90y5PA+sua5Y7ENysge3sA6BiG79i3iRSgCrcNVXbvS7JUi116UlRwqcuxPSEMusIZNItxFC1remkKpVlYlFBvyfVxJxoD7c7CS2tDn3mFKlfvLsT0cz/HRcBw2dwmSiMrOY6PGxWD7iLuh759aIJ2NFcVnEz06zIgR61W7g3adSz50/FlvBbWzZSWvblHY9y0LWd3h6zhUtbfDmoexTzJ+7 bowang@Bo-Wangs-MacBook-Pro.local
ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAx0knW4cxQtlGpiYe2i27yazuZ+Y+zaEgG1bSEfBjOhp/RGJ2X1+aAWX7mjKOxSir0HCLIzbBCuLSeJnglgMCXLZUEAbu64OiMkXxBbx7kH3YcVopHUnTP3I5vDvUct+W4ffor5lXyFDBGUkTRzSqWDjE71+gwCXhqrKP21f0uZP9TcrVs//OKB2mGBkfaE9RF9lRJARmZ5w9xANtzv5Nld/eY0CkVA8rKB0+u5aJ5um0KiuNN556IStEMi2u0tFzObgIY7bZdOIVYm8+IE+Q6v2jKGwRY3/jUxqE2XKabc9UW3dZOOUh202bZpLxYwTZuyenDr7a+OyDegv7IhFtKQ== vulcan@partners.nrelate.com
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDGAI1xSjk5s0GP/0zu1jxVYUE0iaGMH8cvJ1ih+WoMC/4ghMDJwJ/bSSZRqY88uAT0ipd9Y7310XDvVSKHUhtHocLTGxJq4AFzwa4OFwzHaHh0zXMw0IKGRX3nA683cYygVcc9b86C+DVDLRBmZssNS/qf9h3/sfU1B5fFqKQpw+cWe5W6hs1fbBXJMEz1bT+1Ho1LCpXSA/nJAKyvDMg2ogD+AsV8YFSpNnomUTtlVpuM9GQtDJ7RQrEd8NGYzG91Xi2H4fWu8P5haiHPSA3233ikNG6qcyAOqULo0qI8m0nnd2fs6MN/sfHmQ46CuIKERuG0zTCpS+VIiy6ib1zj vulcan@ESS000167
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDHDcLhMx/EUJNP5lM5KXp+aVGvDrMRt75ZvB0PlwtBlU0UYaoOroQlLtK5f9HLfX1fUm6d6WuWVj6niAZve2FLsqNPh5vhZSurhn3+UDTyv65MqazqSvnB1RktGM3GcnE7LQ9qOsCKODLHaqaE4weIhxtwSO8MmITk66UIkgHgwchT/pWPfsKZ0V+Pm7/622bUhCws4GtAJupk5SO+YP3E4dhrnXU5Oqpig6z+bOtr6N4K/MXobonWje0cI3NG0pegLY5++p/bFqE47EG0BWJxTWNPP6ls0MT7M9KaWAeAdZ3dASvK40d7UrcOvVXbQVrMVZz6I3EmBQtbAyDVTVhN carlton.shen@Carltons-rMBP.local
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDQ+W/NbkhZmPLKcEc5HZSUQuqpzabb7SpR0Nbkcs3TCXMDmN6wd/EnQRZ7g6mp584N9n6DhgmrgrYkJrcb96/GcwHaJ8PCfgLx/4yvRS2mDXid6/QxnFvwZE9GtkTmxvun+3+PIIVepIOfyV0NWEbxC3CGCeJPYSE1sijEXapxtA7cru6qqdnksfEbT3azT0W5UXJanXZ+To58XL4lqEl3BdvdTX7KohJsGeS5WHrOughuH2svVKYO+UaRzoB38fbjJm7xX03yJ8iU7u4pdodPdL7ZyVqa8Iyaowvv1/t/Zn2wabBeGDWIJj7PXIeQYBGj6iX9I6jenKoQJQpi2ILL yann.gregoire@gmail.com

ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD0qRcKKJ5Zu/64Ddi8DQduY3mhhDmZB7NPOHK43OEfZFqWp7tjTt5XgW1js/0bpyU9ctki4Uv/8Z6cGDS6CnczS8LfQq1idRMLTxfbR2GCRcbJ7GNrsXs8KgROs7o+hQtJofMZwpdtumdprX7EO0lZTdMpvHB12ojZDdK10kHgOwOiGeBizYMw4Uzc1ea+njjiaj1Nb5NZ95Tk5t/iWbd+bOUKaaWJSIQTMwnY70eJHq7wMxAtBVDjI92Wy+Vq+kRvIllR3G81IUsEzWiUAMzYu82saPsjkW960Jb1qf7q+MpCSbuQNNVdnH/YAXxI+Rf7lMDr0pIx5eLewM+f1zwP bowang@Bos-MacBook-Air.local
