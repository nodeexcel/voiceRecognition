const fs = require("fs");
const path = require("path");
const addon = require('bindings')('voice-recognition');
const { Worker } = require("worker_threads");
const events = require( "events" ).EventEmitter;

class VoiceRecognizer extends events {
	constructor( culture = "" ) 
	{
		super();

		this.sameThread = false;
		this.continuos = true;

		this._worker = null;
		this._stoped = true;
		this._setedFunction = false;
		this._isConstructed = true;

		let installeds = this.installed_cultures();

		if( !addon.constructorJS( culture )) {
			this._isConstructed = false;
			console.error( "[voice-recognition]: Culture [" + culture + "] is not installed on the device. Installed: " + JSON.stringify(installeds));
		}
	}

	/**
	 * @method	listen
	 *
	 * Listen to the recognition engine to hear a phrase.
	 *
	 * @returns	{void}
	 */
	listen() 
	{
		// We stop if the addon has not been built

		if( !this._isConstructed ) {
			console.error( "[voice-recognition]: Addon is not instantiated" )
			return;
		}

		// We listen to the engine

		if( this.sameThread ) {
			this._set_function_emit();

			this._stoped = false;

			setImmediate(() => {
				addon.listen();
			})
		} else {
			this._worker = new Worker( path.resolve( __dirname , "worker.js" ) );

			this._worker.postMessage({
				listen: true,
				continuos: this.continuos
			});

			this._worker.on( "message", response => {
				this._get_result( response.evName, response.result );
			});

			this._worker.on( "error", error => {
				console.error( "[voice-recognition]: ", error )
			});

			this._worker.on( "exit", () => {
				
			});
		}
	}

	/** TODO: Esta función está por implemtar en C#
	 * @method	set_input_from_wav
	 * 
	 * It tells the recognizer from which audio file it will recognize. If this is not assigned, 
	 * the recognizer will do so directly from the microphone.
	 * 
	 * @param 	{string} 	file 			Path to the audio file from which we want recognition.
	 * @returns	{void}
	 */
	set_input_from_wav( file = null )
	{
		// Detenemos si no se ha construido el addon

		if( !this._isConstructed ) {
			console.error( "[voice-recognition]: Addon is not instantiated" )
			return;
		}

		if( !file || !fs.existsSync( file ) ) {
			console.error( "[voice-recognition]: No se ha pasado un archivo válido para el reconocedor." )
		}

		console.warn( "[voice-recognition]: Esta función aun no está implementada." )
	}

	/**
	 * @method	add_grammar_from_xml
	 * 
	 * Assign a grammar to the recognizer from a file.
	 * 
	 * @param	{string}	file 			Path to the XML file containing the grammar.
	 * @returns	{void}
	 */
	add_grammar_from_xml( file = null, name = "mygrammar" ) 
	{
		// Detenemos si no se ha construido el addon

		if( !this._isConstructed ) {
			console.error( "[voice-recognition]: Addon is not instantiated" )
			return;
		}

		if( !file || !fs.existsSync( file ) ) {
			console.error( "[voice-recognition]: Grammar file does not exists." )
			return false;
		}
		
		addon.add_grammar_XML( file, name );
	}

	/**
	 * @method	_audio_level
	 * 
	 * Receive the audio level event sent by the recognition engine.
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_audio_level( result )
	{
		let rJSON = JSON.parse( result );
		this.emit("vc:audioLevel", parseInt( rJSON.AudioLevel ));
	}

	/**
	 * @method	_audio_problem
	 * 
	 * You receive the audio problem event sent by the recognition engine
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_audio_problem( result )
	{
		let rJSON = JSON.parse( result );

		this.emit("vc:audioProblem", rJSON );
	}

	/**
	 * @method	_detected
	 * 
	 * Receive the detection event sent by the recognition engine.
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_detected( result )
	{
		let rJSON = JSON.parse( result );

		this.emit("vc:detected", rJSON.AudioPosition );
	}



	/**
	 * @method	_hypothesized
	 * 
	 * Receive the hypothetical text event sent by the recognition engine.
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_hypothesized( result )
	{
		let response = this._construct_result( result );

		this.emit("vc:hypothesized", response );
	}

	/**
	 * @method	_rejected
	 * 
	 * Receive the rejected event sent by the recognition engine.
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_rejected( result )
	{
		let response = this._construct_result( result );

		this.emit("vc:rejected", response );

		if( this.sameThread && this.continuos && !this._stoped ) {
			this.listen();
		}
	}

	/**
	 * @method	_completed
	 * 
	 * Receive the completion event sent by the recognition engine.
	 * 
	 * @param	{string}	result		Event result in JSON
	 * @returns	{void}
	 */
	_completed( result )
	{
		let response = this._construct_result( result );
		
		this.emit("vc:completed", response );
	}

	/**
	 * @method	_error_addon
	 * 
	 * Handles the errors returned by the addon.
	 * 
	 * @param 	{string} 	error 			Error returned by the addon.
	 * @returns	{void}
	 */
	_error_addon( error )
	{
		console.error( "[voice-recognition]: " + error );
		this.stop();
	}

	/**
	 * @method	_construct_result
	 * 
	 * Construct the result returned by C# to return it in a proper order.
	 * 
	 * @param 	{object} 	result 			Voice recognition result.
	 * @returns	{object}					Object with the result properly ordered.
	 */
	_construct_result( result ) 
	{
		let response = JSON.parse( result );
		response.Semantics = JSON.parse( response.Semantics );

		return response;
	}
}

module.exports.VoiceRecognizer = VoiceRecognizer;