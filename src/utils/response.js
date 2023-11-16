
const errorResponse = (_e, _code, _res) => {
    _res.status(_code).json({status:"ERROR", message: _e.message})
}

export default errorResponse