class CustomError extends Error{
    constructor(msg, statusCode){
        super(msg)
        this.statusCode= statusCode;
        this.status= statusCode>=400 && statusCode<500 ?'fail': 'error';

        this.isOperational = true;
        Error.captureStackTrace(this,this.constructor);
    }
}

module.exports= CustomError