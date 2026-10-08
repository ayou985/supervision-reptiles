// Emulation pedagogique du protocole I2C BH1750, commandes H-res et MTreg.
// Ne modelise pas le bruit, la derive spectrale ni le temps de conversion optique.
#include "wokwi-api.h"
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>
typedef struct {uint32_t lux;uint8_t mtreg,mode,index;uint16_t data;bool on;} chip_t;
static bool connect(void *user,uint32_t address,bool read) {
  chip_t *c=user;c->index=0;
  if(read){float raw=attr_read_float(c->lux)*1.2f*c->mtreg/69.0f;
    if(c->mode==0x11 || c->mode==0x21) raw*=2;
    c->data=!c->on?0:(raw>65535?65535:(uint16_t)raw);}
  return address==0x23;
}
static uint8_t read_byte(void *user){chip_t *c=user;return c->index++==0?c->data>>8:c->data&255;}
static bool write_byte(void *user,uint8_t value){
  chip_t *c=user;
  if(value==0)c->on=false;
  else if(value==1)c->on=true;
  else if(value==7)c->data=0;
  else if((value&0xf8)==0x40)c->mtreg=(c->mtreg&31)|((value&7)<<5);
  else if((value&0xe0)==0x60)c->mtreg=(c->mtreg&224)|(value&31);
  else if(value==0x10 || value==0x11 || value==0x20 || value==0x21){c->mode=value;c->on=true;}
  return true;
}
void chip_init(void){
  chip_t *c=calloc(1,sizeof(chip_t));c->mtreg=69;c->mode=0x10;c->lux=attr_init_float("lux",45000);
  const i2c_config_t config={.address=0x23,.sda=pin_init("SDA",INPUT_PULLUP),.scl=pin_init("SCL",INPUT_PULLUP),.connect=connect,.read=read_byte,.write=write_byte,.user_data=c};
  i2c_init(&config);
}
