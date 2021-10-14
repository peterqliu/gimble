
export default (url, cb) => {

	fetch(url)
	    .then(handleErrors)
		.then(r => {
			if (r.ok === 'false') cb(r, undefined)
			else cb(r, r)
		})

	function handleErrors(response) {
	    if (!response.ok) return response
	    else return response.json() 
	}

}

