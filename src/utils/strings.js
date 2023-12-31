const capitalize = (string) => {
    try{
        if(!string) return null
        return string.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } catch(err){
        throw err
    }
}

export { capitalize }