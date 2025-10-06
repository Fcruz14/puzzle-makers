import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, viewChild } from '@angular/core';
import { GameQuestion } from './components/game-question/game-question';
import { GamePoints } from './components/game-points/game-points';
import { GameOptions } from './components/game-options/game-options';
import { inAnswer, inQuestion } from '../../../../core/interfaces/question';
import { MapC } from '../map/map';

interface coordenadas {
  lat:number,
  lng:number
}

@Component({
  selector: 'app-mini-game',
  imports: [CommonModule, GameQuestion,GameOptions],
  templateUrl: './mini-game.html',
  styleUrl: './mini-game.scss'
})
export class MiniGame implements OnInit{

  gameQuestionComponent = viewChild(GameQuestion);
  mapComponent = viewChild(MapC)
  
  getQuestion(coord:coordenadas){
    console.log(coord);
    this.gameQuestionComponent()?.getQuestion(coord);
  }

  expandView(){
    this.mapComponent()?.expandView();
  }


  actualQuestion = signal<inQuestion>({} as inQuestion);
  showGame = signal<boolean>(false);

  constructor(){}

  ngOnInit(): void {
   
    setTimeout(() => {
      this.showGame.set(true)
    }, 5000);
    // #region GET QUESTIONS
    
  }

  changeShowGame(state:boolean){

  }

}
