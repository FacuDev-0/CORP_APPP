import bcrypt from 'bcrypt'

class BcryptObj {
    constructor(user, confirm){
        this.user = user
        this.confirm = confirm
    }
    //Hashear Password
    async hashPass(){
        const sal = 10
        this.user.password = await bcrypt.hash(this.user.password, sal)
        return this.user
    }
    //Confirmar Password
    async confirmPass(passConfirm){
        const response = await bcrypt.compare(passConfirm, this.user.password)
        return response
    }
}

export default BcryptObj